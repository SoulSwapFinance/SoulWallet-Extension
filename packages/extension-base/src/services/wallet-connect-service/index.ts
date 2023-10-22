// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { formatJsonRpcError } from '@json-rpc-tools/utils';
import KoniState from '@soul-wallet/extension-base/koni/background/handlers/State';
import RequestService from '@soul-wallet/extension-base/services/request-service';
import Eip155RequestHandler from '@soul-wallet/extension-base/services/wallet-connect-service/handler/Eip155RequestHandler';
import SignClient from '@walletconnect/sign-client';
import { EngineTypes, SessionTypes, SignClientTypes } from '@walletconnect/types';
import { getInternalError, getSdkError } from '@walletconnect/utils';
import { BehaviorSubject } from 'rxjs';

import PolkadotRequestHandler from './handler/PolkadotRequestHandler';
import { ALL_WALLET_CONNECT_EVENT, DEFAULT_WALLET_CONNECT_OPTIONS, WALLET_CONNECT_SUPPORTED_METHODS } from './constants';
import { convertConnectRequest, convertNotSupportRequest, isSupportWalletConnectChain } from './helpers';
import { EIP155_SIGNING_METHODS, POLKADOT_SIGNING_METHODS, ResultApproveWalletConnectSession, WalletConnectSigningMethod } from './types';

export default class WalletConnectService {
  readonly #requestService: RequestService;
  readonly #polkadotRequestHandler: PolkadotRequestHandler;
  readonly #eip155RequestHandler: Eip155RequestHandler;
  readonly #koniState: KoniState;

  #client: SignClient | undefined;
  #option: SignClientTypes.Options;

  public readonly sessionSubject: BehaviorSubject<SessionTypes.Struct[]> = new BehaviorSubject<SessionTypes.Struct[]>([]);

  constructor (koniState: KoniState, requestService: RequestService, option: SignClientTypes.Options = DEFAULT_WALLET_CONNECT_OPTIONS) {
    this.#koniState = koniState;
    this.#requestService = requestService;
    this.#option = option;
    this.#polkadotRequestHandler = new PolkadotRequestHandler(this, requestService);
    this.#eip155RequestHandler = new Eip155RequestHandler(this.#koniState, this);

    this.#initClient().catch(console.error);
  }

  get #haveData (): boolean {
    const sessionStorage = localStorage.getItem('wc@2:client:0.3//session');
    const pairingStorage = localStorage.getItem('wc@2:core:0.3//pairing');
    const subscriptionStorage = localStorage.getItem('wc@2:core:0.3//subscription');

    const sessions: Array<unknown> = sessionStorage ? JSON.parse(sessionStorage) as Array<unknown> : [];
    const pairings: Array<unknown> = pairingStorage ? JSON.parse(pairingStorage) as Array<unknown> : [];
    const subscriptions: Array<unknown> = subscriptionStorage ? JSON.parse(subscriptionStorage) as Array<unknown> : [];

    return !!sessions.length || !!pairings.length || !!subscriptions.length;
  }

  async #initClient (force?: boolean) {
    this.#removeListener();

    if (force || this.#haveData) {
      this.#client = await SignClient.init(this.#option);
    }

    this.#updateSessions();
    this.#createListener();
  }

  public get sessions (): SessionTypes.Struct[] {
    return this.#client?.session.values || [];
  }

  #updateSessions () {
    this.sessionSubject.next(this.sessions);
  }

  #onSessionProposal (proposal: SignClientTypes.EventArguments['session_proposal']) {
    this.#checkClient();

    this.#requestService.addConnectWCRequest(convertConnectRequest(proposal));
  }

  #onSessionRequest (requestEvent: SignClientTypes.EventArguments['session_request']) {
    this.#checkClient();

    const { id, params, topic } = requestEvent;
    const { chainId, request } = params;
    const method = request.method as WalletConnectSigningMethod;

    try {
      const requestSession = this.getSession(topic);

      const namespaces = Object.keys(requestSession.namespaces);
      const chains = Object.values(requestSession.namespaces).map((namespace) => namespace.chains as string[]).flat();
      const methods = Object.values(requestSession.namespaces).map((namespace) => namespace.methods).flat();
      const chainInfoMap = this.#koniState.getChainInfoMap();

      const [requestNamespace] = chainId.split(':');

      if (!namespaces.includes(requestNamespace)) {
        throw Error(getSdkError('UNSUPPORTED_NAMESPACE_KEY').message);
      }

      if (!chains.includes(chainId)) {
        throw Error(getSdkError('UNSUPPORTED_CHAINS').message + ' ' + chainId);
      }

      if (!isSupportWalletConnectChain(chainId, chainInfoMap)) {
        throw Error(getSdkError('UNSUPPORTED_CHAINS').message + ' ' + chainId);
      }

      if (!methods.includes(method)) {
        throw Error(getSdkError('UNAUTHORIZED_METHOD').message + ' ' + method);
      }

      if (!WALLET_CONNECT_SUPPORTED_METHODS.includes(method)) {
        throw Error(getSdkError('UNSUPPORTED_METHODS').message + ' ' + method);
      }

      switch (method) {
        case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_MESSAGE:
        case POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_TRANSACTION:
          this.#polkadotRequestHandler.handleRequest(requestEvent);
          break;
        case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
        case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
        case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
        case EIP155_SIGNING_METHODS.ETH_SIGN:
          this.#eip155RequestHandler.handleRequest(requestEvent);
          break;
        default:
          throw Error(getSdkError('INVALID_METHOD').message + ' ' + method);
      }
    } catch (e) {
      console.log(e);

      try {
        const requestSession = this.getSession(topic);
        const notSupportRequest = convertNotSupportRequest(requestEvent, requestSession.peer.metadata.url);

        this.#requestService.addNotSupportWCRequest(notSupportRequest);
      } catch (e) {}

      this.responseRequest({
        topic: topic,
        response: formatJsonRpcError(id, (e as Error).message)
      }).catch(console.error);
    }
  }

  #createListener () {
    this.#client?.on('session_proposal', this.#onSessionProposal.bind(this));
    this.#client?.on('session_request', this.#onSessionRequest.bind(this));
    this.#client?.on('session_ping', (data) => console.log('ping', data));
    this.#client?.on('session_event', (data) => console.log('event', data));
    this.#client?.on('session_update', (data) => console.log('update', data));
    this.#client?.on('session_delete', this.#updateSessions.bind(this));
  }

  // Remove old listener
  #removeListener () {
    ALL_WALLET_CONNECT_EVENT.forEach((event) => {
      this.#client?.removeAllListeners(event);
    });
  }

  #checkClient () {
    if (!this.#client) {
      throw new Error(getInternalError('NOT_INITIALIZED').message);
    }
  }

  public getSession (topic: string): SessionTypes.Struct {
    const session = this.#client?.session.get(topic);

    if (!session) {
      throw new Error(getInternalError('MISMATCHED_TOPIC').message);
    } else {
      return session;
    }
  }

  public async changeOption (newOption: Omit<SignClientTypes.Options, 'projectId'>) {
    this.#option = Object.assign({}, this.#option, newOption);
    await this.#initClient();
  }

  public async connect (uri: string) {
    if (!this.#haveData) {
      await this.#initClient(true);
    }

    this.#checkClient();

    await this.#client?.pair({ uri });
  }

  public async approveSession (result: ResultApproveWalletConnectSession) {
    this.#checkClient();
    await this.#client?.approve(result);
    this.#updateSessions();
  }

  public async rejectSession (id: number) {
    this.#checkClient();
    await this.#client?.reject({
      id: id,
      reason: getSdkError('USER_REJECTED')
    });
  }

  public async responseRequest (response: EngineTypes.RespondParams) {
    this.#checkClient();

    await this.#client?.respond(response);
  }

  public async resetWallet (resetAll: boolean) {
    this.#removeListener();

    // Disconnect session
    const sessions = this.#client?.session.values || [];

    for (const session of sessions) {
      try {
        await this.#client?.disconnect({
          topic: session.topic,
          reason: getSdkError('USER_DISCONNECTED')
        });
      } catch (e) {
        console.error(e);
      }
    }

    // Disconnect pair
    const pairs = this.#client?.pairing.values || [];

    for (const pair of pairs) {
      try {
        await this.#client?.disconnect({
          topic: pair.topic,
          reason: getSdkError('USER_DISCONNECTED')
        });
      } catch (e) {
        console.error(e);
      }
    }

    const keys: string[] = await this.#client?.core.storage.getKeys() || [];

    const deleteKeys = resetAll ? keys : keys.filter((key) => key.startsWith('wc@'));

    for (const key of deleteKeys) {
      try {
        await this.#client?.core.storage.removeItem(key);
      } catch (e) {
        console.error(e);
      }
    }

    await this.#initClient();
    this.#updateSessions();
  }

  public async disconnect (topic: string) {
    await this.#client?.disconnect({
      topic: topic,
      reason: getSdkError('USER_DISCONNECTED')
    });

    this.#updateSessions();
  }
}
