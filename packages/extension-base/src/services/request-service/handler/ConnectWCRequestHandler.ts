// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Resolver } from '@soul-wallet/extension-base/src/background/types';
import RequestService from '@soul-wallet/extension-base/src/services/request-service';
import { RequestWalletConnectSession, WalletConnectSessionRequest } from '@soul-wallet/extension-base/src/services/wallet-connect-service/types';
import { BehaviorSubject } from 'rxjs';

// WC = WalletConnect
export default class ConnectWCRequestHandler {
  readonly #requestService: RequestService;
  readonly #connectWCRequests: Record<string, RequestWalletConnectSession> = {};
  public readonly connectWCSubject: BehaviorSubject<WalletConnectSessionRequest[]> = new BehaviorSubject<WalletConnectSessionRequest[]>([]);

  constructor (requestService: RequestService) {
    this.#requestService = requestService;
  }

  public get allConnectWCRequests (): WalletConnectSessionRequest[] {
    return Object
      .values(this.#connectWCRequests)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ reject, resolve, ...data }) => data);
  }

  public get numConnectWCRequests (): number {
    return Object.keys(this.#connectWCRequests).length;
  }

  public getConnectWCRequest (id: string): RequestWalletConnectSession {
    return this.#connectWCRequests[id];
  }

  private updateIconConnectWC (shouldClose?: boolean): void {
    this.connectWCSubject.next(this.allConnectWCRequests);
    this.#requestService.updateIconV2(shouldClose);
  }

  private connectWCComplete = (id: string): Resolver<void> => {
    const complete = (shouldClose: boolean): void => {
      delete this.#connectWCRequests[id];
      this.updateIconConnectWC(shouldClose);
    };

    return {
      reject: (): void => {
        complete(true);
      },
      resolve: (): void => {
        complete(true);
      }
    };
  };

  public addConnectWCRequest (request: WalletConnectSessionRequest) {
    const id = request.id;

    this.#connectWCRequests[id] = {
      ...this.connectWCComplete(id),
      ...request
    };

    this.updateIconConnectWC();
    this.#requestService.popupOpen();
  }

  public resetWallet () {
    for (const request of Object.values(this.#connectWCRequests)) {
      request.reject(new Error('Reset wallet'));
    }

    this.connectWCSubject.next([]);
  }
}
