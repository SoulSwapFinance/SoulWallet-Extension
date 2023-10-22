// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EvmProviderError } from '@soul-wallet/extension-base/background/errors/EvmProviderError';
import { TransactionError } from '@soul-wallet/extension-base/background/errors/TransactionError';
import { AmountData, BasicTxErrorType, BasicTxWarningCode, ChainType, EvmProviderErrorType, EvmSendTransactionRequest, ExtrinsicStatus, ExtrinsicType, NotificationType, TransactionDirection, TransactionHistoryItem } from '@soul-wallet/extension-base/background/KoniTypes';
import { AccountJson } from '@soul-wallet/extension-base/background/types';
import { TransactionWarning } from '@soul-wallet/extension-base/background/warnings/TransactionWarning';
import { ALL_ACCOUNT_KEY } from '@soul-wallet/extension-base/constants';
import { BalanceService } from '@soul-wallet/extension-base/services/balance-service';
import { ChainService } from '@soul-wallet/extension-base/services/chain-service';
import { _TRANSFER_CHAIN_GROUP } from '@soul-wallet/extension-base/services/chain-service/constants';
import { _getChainNativeTokenBasicInfo, _getEvmChainId } from '@soul-wallet/extension-base/services/chain-service/utils';
import { EventService } from '@soul-wallet/extension-base/services/event-service';
import { HistoryService } from '@soul-wallet/extension-base/services/history-service';
import NotificationService from '@soul-wallet/extension-base/services/notification-service/NotificationService';
import RequestService from '@soul-wallet/extension-base/services/request-service';
import { EXTENSION_REQUEST_URL } from '@soul-wallet/extension-base/services/request-service/constants';
import DatabaseService from '@soul-wallet/extension-base/services/storage-service/DatabaseService';
import { TRANSACTION_TIMEOUT } from '@soul-wallet/extension-base/services/transaction-service/constants';
import { parseTransferEventLogs, parseXcmEventLogs } from '@soul-wallet/extension-base/services/transaction-service/event-parser';
import { getBaseTransactionInfo, getTransactionId, isSubstrateTransaction } from '@soul-wallet/extension-base/services/transaction-service/helpers';
import { SWTransaction, SWTransactionInput, SWTransactionResponse, TransactionEmitter, TransactionEventMap, TransactionEventResponse, ValidateTransactionResponseInput } from '@soul-wallet/extension-base/services/transaction-service/types';
import { getExplorerLink, parseTransactionData } from '@soul-wallet/extension-base/services/transaction-service/utils';
import { isWalletConnectRequest } from '@soul-wallet/extension-base/services/wallet-connect-service/helpers';
import { Web3Transaction } from '@soul-wallet/extension-base/signers/types';
import { anyNumberToBN } from '@soul-wallet/extension-base/utils/eth';
import { mergeTransactionAndSignature } from '@soul-wallet/extension-base/utils/eth/mergeTransactionAndSignature';
import { isContractAddress, parseContractInput } from '@soul-wallet/extension-base/utils/eth/parseTransaction';
import keyring from '@subwallet/ui-keyring';
import BigN from 'bignumber.js';
import { addHexPrefix } from 'ethereumjs-util';
import { ethers, TransactionLike } from 'ethers';
import EventEmitter from 'eventemitter3';
import { t } from 'i18next';
import { BehaviorSubject } from 'rxjs';
import { TransactionConfig, TransactionReceipt } from 'web3-core';
import { Subscription } from 'web3-core-subscriptions';
import { BlockHeader } from 'web3-eth';

import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { Signer, SignerResult } from '@polkadot/api/types';
import { EventRecord } from '@polkadot/types/interfaces';
import { SignerPayloadJSON } from '@polkadot/types/types/extrinsic';
import { isHex } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';

export default class TransactionService {
  private readonly balanceService: BalanceService;
  private readonly chainService: ChainService;
  private readonly databaseService: DatabaseService;
  private readonly eventService: EventService;
  private readonly historyService: HistoryService;
  private readonly notificationService: NotificationService;
  private readonly requestService: RequestService;
  private readonly transactionSubject: BehaviorSubject<Record<string, SWTransaction>> = new BehaviorSubject<Record<string, SWTransaction>>({});

  private readonly watchTransactionSubscribes: Record<string, Promise<void>> = {};

  private get transactions (): Record<string, SWTransaction> {
    return this.transactionSubject.getValue();
  }

  constructor (chainService: ChainService, eventService: EventService, requestService: RequestService, balanceService: BalanceService, historyService: HistoryService, notificationService: NotificationService, databaseService: DatabaseService) {
    this.chainService = chainService;
    this.eventService = eventService;
    this.requestService = requestService;
    this.balanceService = balanceService;
    this.historyService = historyService;
    this.notificationService = notificationService;
    this.databaseService = databaseService;
  }

  private get allTransactions (): SWTransaction[] {
    return Object.values(this.transactions);
  }

  private get processingTransactions (): SWTransaction[] {
    return this.allTransactions.filter((t) => t.status === ExtrinsicStatus.QUEUED || t.status === ExtrinsicStatus.SUBMITTING);
  }

  public getTransaction (id: string) {
    return this.transactions[id];
  }

  private checkDuplicate (transaction: ValidateTransactionResponseInput): TransactionError[] {
    // Check duplicated transaction
    const existed = this.processingTransactions
      .filter((item) => item.address === transaction.address && item.chain === transaction.chain);

    if (existed.length > 0) {
      return [new TransactionError(BasicTxErrorType.DUPLICATE_TRANSACTION)];
    }

    return [];
  }

  public async generalValidate (validationInput: SWTransactionInput): Promise<SWTransactionResponse> {
    const validation = {
      ...validationInput,
      errors: validationInput.errors || [],
      warnings: validationInput.warnings || []
    };
    const { additionalValidator, address, chain, edAsWarning, extrinsicType, isTransferAll, transaction } = validation;

    // Check duplicate transaction
    validation.errors.push(...this.checkDuplicate(validationInput));

    // Return unsupported error if not found transaction
    if (!transaction) {
      if (extrinsicType === ExtrinsicType.SEND_NFT) {
        validation.errors.push(new TransactionError(BasicTxErrorType.UNSUPPORTED, t('This feature is not yet available for this NFT')));
      } else {
        validation.errors.push(new TransactionError(BasicTxErrorType.UNSUPPORTED));
      }
    }

    const validationResponse: SWTransactionResponse = {
      status: undefined,
      ...validation
    };

    // Estimate fee
    const estimateFee: AmountData = {
      symbol: '',
      decimals: 0,
      value: ''
    };

    const chainInfo = this.chainService.getChainInfoByKey(chain);

    if (!chainInfo) {
      validationResponse.errors.push(new TransactionError(BasicTxErrorType.INTERNAL_ERROR, t('Cannot find network')));
    } else {
      const { decimals, symbol } = _getChainNativeTokenBasicInfo(chainInfo);

      estimateFee.decimals = decimals;
      estimateFee.symbol = symbol;

      if (transaction) {
        try {
          if (isSubstrateTransaction(transaction)) {
            estimateFee.value = (await transaction.paymentInfo(address)).partialFee.toString();
          } else {
            const web3 = this.chainService.getEvmApi(chain);

            if (!web3) {
              validationResponse.errors.push(new TransactionError(BasicTxErrorType.CHAIN_DISCONNECTED, undefined));
            } else {
              const gasPrice = await web3.api.eth.getGasPrice();
              const gasLimit = await web3.api.eth.estimateGas(transaction);

              estimateFee.value = (gasLimit * parseInt(gasPrice)).toString();
            }
          }
        } catch (e) {
          const error = e as Error;

          if (error.message.includes('gas required exceeds allowance') && error.message.includes('insufficient funds')) {
            validationResponse.errors.push(new TransactionError(BasicTxErrorType.NOT_ENOUGH_BALANCE));
          }

          estimateFee.value = '0';
        }
      }
    }

    validationResponse.estimateFee = estimateFee;

    // Read-only account
    const pair = keyring.getPair(address);

    if (!pair) {
      validationResponse.errors.push(new TransactionError(BasicTxErrorType.INTERNAL_ERROR, t('Unable to find account')));
    } else {
      if (pair.meta?.isReadOnly) {
        validationResponse.errors.push(new TransactionError(BasicTxErrorType.INTERNAL_ERROR, t('This account is watch-only')));
      }
    }

    // Balance
    const transferNative = validationResponse.transferNativeAmount || '0';
    const nativeTokenInfo = this.chainService.getNativeTokenInfo(chain);

    const balance = await this.balanceService.getTokenFreeBalance(address, chain, nativeTokenInfo.slug);

    const existentialDeposit = nativeTokenInfo.minAmount || '0';

    const feeNum = parseInt(estimateFee.value);
    const balanceNum = parseInt(balance.value);
    const edNum = parseInt(existentialDeposit);
    const transferNativeNum = parseInt(transferNative);

    if (!new BigN(balance.value).gt(0)) {
      validationResponse.errors.push(new TransactionError(BasicTxErrorType.NOT_ENOUGH_BALANCE));
    }

    if (transferNativeNum + feeNum > balanceNum) {
      if (!isTransferAll) {
        validationResponse.errors.push(new TransactionError(BasicTxErrorType.NOT_ENOUGH_BALANCE));
      } else {
        if ([
          ..._TRANSFER_CHAIN_GROUP.acala,
          ..._TRANSFER_CHAIN_GROUP.genshiro,
          ..._TRANSFER_CHAIN_GROUP.bitcountry,
          ..._TRANSFER_CHAIN_GROUP.statemine
        ].includes(chain)) { // Chain not have transfer all function
          validationResponse.errors.push(new TransactionError(BasicTxErrorType.NOT_ENOUGH_BALANCE));
        }
      }
    }

    if (!isTransferAll) {
      if (balanceNum - (transferNativeNum + feeNum) < edNum) {
        if (edAsWarning) {
          validationResponse.warnings.push(new TransactionWarning(BasicTxWarningCode.NOT_ENOUGH_EXISTENTIAL_DEPOSIT));
        } else {
          validationResponse.errors.push(new TransactionError(BasicTxErrorType.NOT_ENOUGH_EXISTENTIAL_DEPOSIT));
        }
      }
    }

    // Validate transaction with additionalValidator method
    additionalValidator && await additionalValidator(validationResponse);

    return validationResponse;
  }

  public getTransactionSubject () {
    return this.transactionSubject;
  }

  private fillTransactionDefaultInfo (transaction: SWTransactionInput): SWTransaction {
    const isInternal = !transaction.url;
    const transactionId = getTransactionId(transaction.chainType, transaction.chain, isInternal, isWalletConnectRequest(transaction.id));

    return {
      ...transaction,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      errors: transaction.errors || [],
      warnings: transaction.warnings || [],
      url: transaction.url || EXTENSION_REQUEST_URL,
      status: ExtrinsicStatus.QUEUED,
      isInternal,
      id: transactionId,
      extrinsicHash: transactionId
    } as SWTransaction;
  }

  public async addTransaction (inputTransaction: SWTransactionInput): Promise<TransactionEmitter> {
    const transactions = this.transactions;
    // Fill transaction default info
    const transaction = this.fillTransactionDefaultInfo(inputTransaction);

    // Add Transaction
    transactions[transaction.id] = transaction;
    this.transactionSubject.next({ ...transactions });

    return await this.sendTransaction(transaction);
  }

  public generateBeforeHandleResponseErrors (errors: TransactionError[]): SWTransactionResponse {
    return {
      errors,
      additionalValidator: undefined,
      address: '',
      chain: '',
      chainType: ChainType.SUBSTRATE,
      data: undefined,
      extrinsicType: ExtrinsicType.UNKNOWN,
      transferNativeAmount: undefined,
      url: undefined,
      warnings: []
    };
  }

  public async handleTransaction (transaction: SWTransactionInput): Promise<SWTransactionResponse> {
    const validatedTransaction = await this.generalValidate(transaction);
    const stopByErrors = validatedTransaction.errors.length > 0;
    const stopByWarnings = validatedTransaction.warnings.length > 0 && !validatedTransaction.ignoreWarnings;

    if (stopByErrors || stopByWarnings) {
      // @ts-ignore
      'transaction' in validatedTransaction && delete validatedTransaction.transaction;
      'additionalValidator' in validatedTransaction && delete validatedTransaction.additionalValidator;
      'eventsHandler' in validatedTransaction && delete validatedTransaction.eventsHandler;

      return validatedTransaction;
    }

    validatedTransaction.warnings = [];

    const emitter = await this.addTransaction(validatedTransaction);

    await new Promise<void>((resolve) => {
      emitter.on('signed', (data: TransactionEventResponse) => {
        validatedTransaction.id = data.id;
        validatedTransaction.extrinsicHash = data.extrinsicHash;
        resolve();
      });

      emitter.on('error', (data: TransactionEventResponse) => {
        if (data.errors.length > 0) {
          validatedTransaction.errors.push(...data.errors);
          resolve();
        }
      });
    });

    // @ts-ignore
    'transaction' in validatedTransaction && delete validatedTransaction.transaction;
    'additionalValidator' in validatedTransaction && delete validatedTransaction.additionalValidator;
    'eventsHandler' in validatedTransaction && delete validatedTransaction.eventsHandler;

    return validatedTransaction;
  }

  private async sendTransaction (transaction: SWTransaction): Promise<TransactionEmitter> {
    // Send Transaction
    const emitter = transaction.chainType === 'substrate' ? this.signAndSendSubstrateTransaction(transaction) : (await this.signAndSendEvmTransaction(transaction));

    const { eventsHandler } = transaction;

    emitter.on('signed', (data: TransactionEventResponse) => {
      this.onSigned(data);
    });

    emitter.on('send', (data: TransactionEventResponse) => {
      this.onSend(data);
    });

    emitter.on('extrinsicHash', (data: TransactionEventResponse) => {
      this.onHasTransactionHash(data);
    });

    emitter.on('success', (data: TransactionEventResponse) => {
      this.handlePostProcessing(data.id);
      this.onSuccess(data);
    });

    emitter.on('error', (data: TransactionEventResponse) => {
      // this.handlePostProcessing(data.id); // might enable this later
      this.onFailed({ ...data, errors: [...data.errors, new TransactionError(BasicTxErrorType.INTERNAL_ERROR)] });
    });

    // Todo: handle any event with transaction.eventsHandler

    eventsHandler?.(emitter);

    return emitter;
  }

  private removeTransaction (id: string): void {
    if (this.transactions[id]) {
      delete this.transactions[id];
      this.transactionSubject.next({ ...this.transactions });
    }
  }

  private updateTransaction (id: string, data: Partial<Omit<SWTransaction, 'id'>>): void {
    const transaction = this.transactions[id];

    if (transaction) {
      this.transactions[id] = {
        ...transaction,
        ...data
      };
    }
  }

  private getTransactionLink (id: string): string | undefined {
    const transaction = this.getTransaction(id);
    const chainInfo = this.chainService.getChainInfoByKey(transaction.chain);

    return getExplorerLink(chainInfo, transaction.extrinsicHash, 'tx');
  }

  private transactionToHistories (id: string, startBlock?: number, nonce?: number, eventLogs?: EventRecord[]): TransactionHistoryItem[] {
    const transaction = this.getTransaction(id);
    const extrinsicType = transaction.extrinsicType;
    const historyItem: TransactionHistoryItem = {
      origin: 'app',
      chain: transaction.chain,
      direction: TransactionDirection.SEND,
      type: transaction.extrinsicType,
      from: transaction.address,
      to: '',
      chainType: transaction.chainType,
      address: transaction.address,
      status: transaction.status,
      transactionId: transaction.id,
      extrinsicHash: transaction.extrinsicHash,
      time: transaction.createdAt,
      fee: transaction.estimateFee,
      blockNumber: 0, // Will be added in next step
      blockHash: '', // Will be added in next step
      nonce: nonce ?? 0,
      startBlock: startBlock || 0
    };

    const chainInfo = this.chainService.getChainInfoByKey(transaction.chain);
    const nativeAsset = _getChainNativeTokenBasicInfo(chainInfo);
    const baseNativeAmount = { value: '0', decimals: nativeAsset.decimals, symbol: nativeAsset.symbol };

    // Fill data by extrinsicType
    switch (extrinsicType) {
      case ExtrinsicType.TRANSFER_BALANCE: {
        const inputData = parseTransactionData<ExtrinsicType.TRANSFER_TOKEN>(transaction.data);

        historyItem.to = inputData.to;
        const sendingTokenInfo = this.chainService.getAssetBySlug(inputData.tokenSlug);

        historyItem.amount = { value: inputData.value || '0', decimals: sendingTokenInfo.decimals || 0, symbol: sendingTokenInfo.symbol };
        eventLogs && parseTransferEventLogs(historyItem, eventLogs, transaction.chain, sendingTokenInfo, chainInfo);
      }

        break;
      case ExtrinsicType.TRANSFER_TOKEN: {
        const inputData = parseTransactionData<ExtrinsicType.TRANSFER_TOKEN>(transaction.data);

        historyItem.to = inputData.to;
        const sendingTokenInfo = this.chainService.getAssetBySlug(inputData.tokenSlug);

        historyItem.amount = { value: inputData.value || '0', decimals: sendingTokenInfo.decimals || 0, symbol: sendingTokenInfo.symbol };
        eventLogs && parseTransferEventLogs(historyItem, eventLogs, transaction.chain, sendingTokenInfo, chainInfo);
      }

        break;
      case ExtrinsicType.TRANSFER_XCM: {
        const inputData = parseTransactionData<ExtrinsicType.TRANSFER_XCM>(transaction.data);

        historyItem.to = inputData.to;
        const sendingTokenInfo = this.chainService.getAssetBySlug(inputData.tokenSlug);

        historyItem.amount = { value: inputData.value || '0', decimals: sendingTokenInfo.decimals || 0, symbol: sendingTokenInfo.symbol };

        // @ts-ignore
        historyItem.additionalInfo = { destinationChain: inputData?.destinationNetworkKey || '', originalChain: inputData.originNetworkKey || '', fee: transaction.estimateFee };
        eventLogs && parseXcmEventLogs(historyItem, eventLogs, transaction.chain, sendingTokenInfo, chainInfo);
      }

        break;
      case ExtrinsicType.SEND_NFT: {
        const inputData = parseTransactionData<ExtrinsicType.SEND_NFT>(transaction.data);

        historyItem.to = inputData.recipientAddress;
        historyItem.amount = {
          decimals: 0,
          symbol: 'NFT',
          value: '1'
        };
      }

        break;
      case ExtrinsicType.STAKING_BOND: {
        const data = parseTransactionData<ExtrinsicType.STAKING_BOND>(transaction.data);

        historyItem.amount = { ...baseNativeAmount, value: data.amount || '0' };
      }

        break;
      case ExtrinsicType.STAKING_JOIN_POOL: {
        const data = parseTransactionData<ExtrinsicType.STAKING_JOIN_POOL>(transaction.data);

        historyItem.amount = { ...baseNativeAmount, value: data.amount || '0' };
        historyItem.to = data.selectedPool.name || data.selectedPool.id.toString();
      }

        break;
      case ExtrinsicType.STAKING_UNBOND:
        {
          const data = parseTransactionData<ExtrinsicType.STAKING_UNBOND>(transaction.data);

          historyItem.to = data.validatorAddress || '';
          historyItem.amount = { ...baseNativeAmount, value: data.amount || '0' };
        }

        break;
      case ExtrinsicType.STAKING_LEAVE_POOL:
        {
          const data = parseTransactionData<ExtrinsicType.STAKING_LEAVE_POOL>(transaction.data);

          historyItem.to = data.nominatorMetadata.address || '';
          historyItem.amount = { ...baseNativeAmount, value: data.amount || '0' };
        }

        break;
      case ExtrinsicType.STAKING_CLAIM_REWARD: {
        const data = parseTransactionData<ExtrinsicType.STAKING_CLAIM_REWARD>(transaction.data);

        historyItem.amount = { ...baseNativeAmount, value: data.unclaimedReward || '0' };
      }

        break;

      case ExtrinsicType.STAKING_WITHDRAW: {
        const data = parseTransactionData<ExtrinsicType.STAKING_WITHDRAW>(transaction.data);

        historyItem.to = data.validatorAddress || '';
        historyItem.amount = { ...baseNativeAmount, value: data.unstakingInfo.claimable || '0' };
        break;
      }

      case ExtrinsicType.STAKING_CANCEL_UNSTAKE: {
        const data = parseTransactionData<ExtrinsicType.STAKING_CANCEL_UNSTAKE>(transaction.data);

        historyItem.amount = { ...baseNativeAmount, value: data.selectedUnstaking.claimable || '0' };
        break;
      }

      case ExtrinsicType.EVM_EXECUTE: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data = parseTransactionData<ExtrinsicType.EVM_EXECUTE>(transaction.data);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
        historyItem.to = data?.to || '';
        break;
      }

      case ExtrinsicType.UNKNOWN:
        break;
    }

    try {
      // Return one more history record if transaction send to account in the wallets
      const toAccount = historyItem?.to && keyring.getPair(historyItem.to);

      if (toAccount) {
        const receiverHistory: TransactionHistoryItem = {
          ...historyItem,
          address: toAccount.address,
          direction: TransactionDirection.RECEIVED
        };

        switch (extrinsicType) {
          case ExtrinsicType.TRANSFER_XCM: {
            const inputData = parseTransactionData<ExtrinsicType.TRANSFER_XCM>(transaction.data);

            receiverHistory.chain = inputData.destinationNetworkKey;
            break;
          }

          default:
            break;
        }

        return [historyItem, receiverHistory];
      }
    } catch (e) {
      console.warn(e);
    }

    return [historyItem];
  }

  private onSigned ({ id }: TransactionEventResponse) {
    console.debug(`Transaction "${id}" is signed`);
  }

  private onSend ({ id, nonce, startBlock }: TransactionEventResponse) {
    // Update transaction status
    this.updateTransaction(id, { status: ExtrinsicStatus.SUBMITTING });

    // Create Input History Transaction History
    this.historyService.insertHistories(this.transactionToHistories(id, startBlock, nonce)).catch(console.error);

    console.debug(`Transaction "${id}" is sent`);
  }

  private onHasTransactionHash ({ blockHash, extrinsicHash, id }: TransactionEventResponse) {
    // Write processing transaction history
    const updateData = { extrinsicHash, status: ExtrinsicStatus.PROCESSING, blockHash: blockHash || '' };

    this.updateTransaction(id, updateData);

    // In this case transaction id is the same as extrinsic hash and will change after below update
    this.historyService.updateHistoryByExtrinsicHash(id, updateData).catch(console.error);

    console.debug(`Transaction "${id}" is submitted with hash ${extrinsicHash || ''}`);
  }

  private handlePostProcessing (id: string) { // must be done after success/failure to make sure the transaction is finalized
    const transaction = this.getTransaction(id);

    if (transaction.extrinsicType === ExtrinsicType.SEND_NFT) {
      const inputData = parseTransactionData<ExtrinsicType.SEND_NFT>(transaction.data);

      try {
        const sender = keyring.getPair(inputData.senderAddress);

        sender && this.databaseService.handleNftTransfer(transaction.chain, [sender.address, ALL_ACCOUNT_KEY], inputData.nftItem)
          .then(() => {
            this.eventService.emit('transaction.transferNft', undefined);
          })
          .catch(console.error);
      } catch (e) {
        console.error(e);
      }

      try {
        const recipient = keyring.getPair(inputData.recipientAddress);

        recipient && this.databaseService.addNft(recipient.address, { ...inputData.nftItem, owner: recipient.address })
          .catch(console.error);
      } catch (e) {
        console.error(e);
      }
    } else if ([ExtrinsicType.STAKING_BOND, ExtrinsicType.STAKING_UNBOND, ExtrinsicType.STAKING_WITHDRAW, ExtrinsicType.STAKING_CANCEL_UNSTAKE, ExtrinsicType.STAKING_CLAIM_REWARD, ExtrinsicType.STAKING_JOIN_POOL, ExtrinsicType.STAKING_POOL_WITHDRAW, ExtrinsicType.STAKING_LEAVE_POOL].includes(transaction.extrinsicType)) {
      this.eventService.emit('transaction.submitStaking', transaction.chain);
    }
  }

  private onSuccess ({ blockHash, blockNumber, extrinsicHash, id }: TransactionEventResponse) {
    const transaction = this.getTransaction(id);

    this.updateTransaction(id, { status: ExtrinsicStatus.SUCCESS, extrinsicHash });

    // Write success transaction history
    this.historyService.updateHistoryByExtrinsicHash(transaction.extrinsicHash, {
      extrinsicHash,
      status: ExtrinsicStatus.SUCCESS,
      blockNumber: blockNumber || 0,
      blockHash: blockHash || ''
    }).catch(console.error);

    const info = isHex(extrinsicHash) ? extrinsicHash : getBaseTransactionInfo(transaction, this.chainService.getChainInfoMap());

    this.notificationService.notify({
      type: NotificationType.SUCCESS,
      title: t('Transaction completed'),
      message: t('Transaction {{info}} completed', { replace: { info } }),
      action: { url: this.getTransactionLink(id) },
      notifyViaBrowser: true
    });

    this.eventService.emit('transaction.done', transaction);
  }

  private onFailed ({ blockHash, blockNumber, errors, extrinsicHash, id }: TransactionEventResponse) {
    const transaction = this.getTransaction(id);
    const nextStatus = ExtrinsicStatus.FAIL;

    if (transaction) {
      this.updateTransaction(id, { status: nextStatus, errors, extrinsicHash });

      // Write failed transaction history
      this.historyService.updateHistoryByExtrinsicHash(transaction.extrinsicHash, {
        extrinsicHash: extrinsicHash || transaction.extrinsicHash,
        status: nextStatus,
        blockNumber: blockNumber || 0,
        blockHash: blockHash || ''
      }).catch(console.error);

      const info = isHex(transaction?.extrinsicHash) ? transaction?.extrinsicHash : getBaseTransactionInfo(transaction, this.chainService.getChainInfoMap());

      this.notificationService.notify({
        type: NotificationType.ERROR,
        title: t('Transaction failed'),
        message: t('Transaction {{info}} failed', { replace: { info } }),
        action: { url: this.getTransactionLink(id) },
        notifyViaBrowser: true
      });
    }

    this.eventService.emit('transaction.failed', transaction);
  }

  public generateHashPayload (chain: string, transaction: TransactionConfig): HexString {
    const chainInfo = this.chainService.getChainInfoByKey(chain);

    const txObject: TransactionLike = {
      nonce: transaction.nonce ?? 0,
      gasPrice: addHexPrefix(anyNumberToBN(transaction.gasPrice).toString(16)),
      gasLimit: addHexPrefix(anyNumberToBN(transaction.gas).toString(16)),
      to: transaction.to !== undefined ? transaction.to : '',
      value: addHexPrefix(anyNumberToBN(transaction.value).toString(16)),
      data: transaction.data,
      chainId: _getEvmChainId(chainInfo)
    };

    return ethers.Transaction.from(txObject).unsignedSerialized as HexString;
  }

  private async signAndSendEvmTransaction ({ address,
    chain,
    id,
    transaction,
    url }: SWTransaction): Promise<TransactionEmitter> {
    const payload = (transaction as EvmSendTransactionRequest);
    const evmApi = this.chainService.getEvmApi(chain);
    const chainInfo = this.chainService.getChainInfoByKey(chain);

    const accountPair = keyring.getPair(address);
    const account: AccountJson = { address, ...accountPair.meta };

    if (!payload.account) {
      payload.account = account;
    }

    // Allow sign transaction
    payload.canSign = true;

    // Fill contract info
    if (!payload.parseData) {
      const isToContract = await isContractAddress(payload.to || '', evmApi);

      payload.isToContract = isToContract;

      try {
        payload.parseData = isToContract
          ? payload.data
            ? (await parseContractInput(payload.data || '', payload.to || '', chainInfo)).result
            : ''
          : payload.data || '';
      } catch (e) {
        console.warn('Unable to parse contract input data');
        payload.parseData = payload.data as string;
      }
    }

    if ('data' in payload && payload.data === undefined) {
      delete payload.data;
    }

    // Set unique nonce to avoid transaction errors
    if (!payload.nonce) {
      const evmApi = this.chainService.getEvmApi(chain);

      payload.nonce = await evmApi.api.eth.getTransactionCount(address);
    }

    if (!payload.chainId) {
      payload.chainId = chainInfo.evmInfo?.evmChainId ?? 1;
    }

    // Autofill from
    if (!payload.from) {
      payload.from = address;
    }

    const isExternal = !!account.isExternal;
    const isInjected = !!account.isInjected;

    // generate hashPayload for EVM transaction
    payload.hashPayload = this.generateHashPayload(chain, payload);

    const emitter = new EventEmitter<TransactionEventMap>();

    const txObject: Web3Transaction = {
      nonce: payload.nonce ?? 0,
      from: payload.from as string,
      gasPrice: anyNumberToBN(payload.gasPrice).toNumber(),
      gasLimit: anyNumberToBN(payload.gas).toNumber(),
      to: payload.to !== undefined ? payload.to : '',
      value: anyNumberToBN(payload.value).toNumber(),
      data: payload.data,
      chainId: payload.chainId
    };

    const eventData: TransactionEventResponse = {
      id,
      errors: [],
      warnings: [],
      extrinsicHash: id
    };

    if (isInjected) {
      this.requestService.addConfirmation(id, url || EXTENSION_REQUEST_URL, 'evmWatchTransactionRequest', payload, {})
        .then(async ({ isApproved, payload }) => {
          if (isApproved) {
            if (!payload) {
              throw new EvmProviderError(EvmProviderErrorType.UNAUTHORIZED, 'Bad signature');
            }

            const web3Api = this.chainService.getEvmApi(chain).api;

            // Emit signed event
            emitter.emit('signed', eventData);

            eventData.nonce = txObject.nonce;
            eventData.startBlock = await web3Api.eth.getBlockNumber() - 3;
            // Add start info
            emitter.emit('send', eventData); // This event is needed after sending transaction with queue

            const txHash = payload;

            eventData.extrinsicHash = txHash;
            emitter.emit('extrinsicHash', eventData);

            this.watchTransactionSubscribes[id] = new Promise<void>((resolve, reject) => {
              // eslint-disable-next-line prefer-const
              let subscribe: Subscription<BlockHeader>;

              const onComplete = () => {
                subscribe?.unsubscribe?.()?.then(console.debug).catch(console.debug);
                delete this.watchTransactionSubscribes[id];
              };

              const onSuccess = (rs: TransactionReceipt) => {
                if (rs) {
                  eventData.extrinsicHash = rs.transactionHash;
                  eventData.blockHash = rs.blockHash;
                  eventData.blockNumber = rs.blockNumber;
                  emitter.emit('success', eventData);
                  onComplete();
                  resolve();
                }
              };

              const onError = (error: Error) => {
                if (error) {
                  // TODO: Change type and message
                  eventData.errors.push(new TransactionError(BasicTxErrorType.UNABLE_TO_SEND, error.message));
                  emitter.emit('error', eventData);
                  onComplete();
                  reject(error);
                }
              };

              const onCheck = () => {
                web3Api.eth.getTransactionReceipt(txHash).then(onSuccess).catch(onError);
              };

              subscribe = web3Api.eth.subscribe('newBlockHeaders', onCheck);
            });
          } else {
            this.removeTransaction(id);
            eventData.errors.push(new TransactionError(BasicTxErrorType.USER_REJECT_REQUEST));
            emitter.emit('error', eventData);
          }
        })
        .catch((e: Error) => {
          this.removeTransaction(id);
          // TODO: Change type
          eventData.errors.push(new TransactionError(BasicTxErrorType.UNABLE_TO_SIGN, e.message));

          emitter.emit('error', eventData);
        });
    } else {
      this.requestService.addConfirmation(id, url || EXTENSION_REQUEST_URL, 'evmSendTransactionRequest', payload, {})
        .then(async ({ isApproved, payload }) => {
          if (isApproved) {
            let signedTransaction: string | undefined;

            if (!payload) {
              throw new EvmProviderError(EvmProviderErrorType.UNAUTHORIZED, t('Failed to sign'));
            }

            const web3Api = this.chainService.getEvmApi(chain).api;

            if (!isExternal) {
              signedTransaction = payload;
            } else {
              const signed = mergeTransactionAndSignature(txObject, payload as `0x${string}`);

              const recover = web3Api.eth.accounts.recoverTransaction(signed);

              if (recover.toLowerCase() !== account.address.toLowerCase()) {
                throw new EvmProviderError(EvmProviderErrorType.UNAUTHORIZED, t('Wrong signature. Please sign with the account you use in dApp'));
              }

              signedTransaction = signed;
            }

            // Emit signed event
            emitter.emit('signed', eventData);

            // Send transaction
            this.handleTransactionTimeout(emitter, eventData);

            // Add start info
            eventData.nonce = txObject.nonce;
            eventData.startBlock = await web3Api.eth.getBlockNumber();
            emitter.emit('send', eventData); // This event is needed after sending transaction with queue
            signedTransaction && web3Api.eth.sendSignedTransaction(signedTransaction)
              .once('transactionHash', (hash) => {
                eventData.extrinsicHash = hash;
                emitter.emit('extrinsicHash', eventData);
              })
              .once('receipt', (rs) => {
                eventData.extrinsicHash = rs.transactionHash;
                eventData.blockHash = rs.blockHash;
                eventData.blockNumber = rs.blockNumber;
                emitter.emit('success', eventData);
              })
              .once('error', (e) => {
                eventData.errors.push(new TransactionError(BasicTxErrorType.SEND_TRANSACTION_FAILED, t(e.message)));
                emitter.emit('error', eventData);
              })
              .catch((e: Error) => {
                eventData.errors.push(new TransactionError(BasicTxErrorType.UNABLE_TO_SEND, t(e.message)));
                emitter.emit('error', eventData);
              });
          } else {
            this.removeTransaction(id);
            eventData.errors.push(new TransactionError(BasicTxErrorType.USER_REJECT_REQUEST));
            emitter.emit('error', eventData);
          }
        })
        .catch((e: Error) => {
          this.removeTransaction(id);
          eventData.errors.push(new TransactionError(BasicTxErrorType.UNABLE_TO_SIGN, t(e.message)));

          emitter.emit('error', eventData);
        });
    }

    return emitter;
  }

  private signAndSendSubstrateTransaction ({ address, chain, id, transaction, url }: SWTransaction): TransactionEmitter {
    const emitter = new EventEmitter<TransactionEventMap>();
    const eventData: TransactionEventResponse = {
      id,
      errors: [],
      warnings: [],
      extrinsicHash: id
    };

    (transaction as SubmittableExtrinsic).signAsync(address, {
      signer: {
        signPayload: async (payload: SignerPayloadJSON) => {
          const signing = await this.requestService.signInternalTransaction(id, address, url || EXTENSION_REQUEST_URL, payload);

          return {
            id: (new Date()).getTime(),
            signature: signing.signature
          } as SignerResult;
        }
      } as Signer
    }).then(async (rs) => {
      // Emit signed event
      emitter.emit('signed', eventData);

      // Send transaction
      const api = this.chainService.getSubstrateApi(chain);

      eventData.nonce = rs.nonce.toNumber();
      eventData.startBlock = (await api.api.query.system.number()).toPrimitive() as number;
      this.handleTransactionTimeout(emitter, eventData);
      emitter.emit('send', eventData); // This event is needed after sending transaction with queue

      rs.send((txState) => {
        // handle events, logs, history
        if (!txState || !txState.status) {
          return;
        }

        if (txState.status.isInBlock) {
          eventData.eventLogs = txState.events;

          if (!eventData.extrinsicHash || eventData.extrinsicHash === '' || !isHex(eventData.extrinsicHash)) {
            eventData.extrinsicHash = txState.txHash.toHex();
            eventData.blockHash = txState.status.asInBlock.toHex();
            emitter.emit('extrinsicHash', eventData);
          }
        }

        if (txState.status.isFinalized) {
          eventData.extrinsicHash = txState.txHash.toHex();
          eventData.eventLogs = txState.events;
          // TODO: push block hash and block number into eventData
          txState.events
            .filter(({ event: { section } }) => section === 'system')
            .forEach(({ event: { method, data: [error] } }): void => {
              if (method === 'ExtrinsicFailed') {
                eventData.errors.push(new TransactionError(BasicTxErrorType.SEND_TRANSACTION_FAILED, error.toString()));
                emitter.emit('error', eventData);
              } else if (method === 'ExtrinsicSuccess') {
                emitter.emit('success', eventData);
              }
            });
        }
      }).catch((e: Error) => {
        eventData.errors.push(new TransactionError(BasicTxErrorType.SEND_TRANSACTION_FAILED, e.message));
        emitter.emit('error', eventData);
      });
    }).catch((e: Error) => {
      this.removeTransaction(id);
      eventData.errors.push(new TransactionError(BasicTxErrorType.UNABLE_TO_SIGN, e.message));
      emitter.emit('error', eventData);
    });

    return emitter;
  }

  private handleTransactionTimeout (emitter: EventEmitter<TransactionEventMap>, eventData: TransactionEventResponse): void {
    const timeout = setTimeout(() => {
      const transaction = this.getTransaction(eventData.id);

      if (transaction.status !== ExtrinsicStatus.SUCCESS && transaction.status !== ExtrinsicStatus.FAIL) {
        eventData.errors.push(new TransactionError(BasicTxErrorType.TIMEOUT, t('Transaction timeout')));
        emitter.emit('error', eventData);
        clearTimeout(timeout);
      }
    }, TRANSACTION_TIMEOUT);

    emitter.once('success', () => {
      clearTimeout(timeout);
    });

    emitter.once('error', () => {
      clearTimeout(timeout);
    });
  }

  public resetWallet (): void {
    this.transactionSubject.next({});
  }
}
