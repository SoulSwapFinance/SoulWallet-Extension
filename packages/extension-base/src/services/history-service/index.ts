// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicStatus, TransactionHistoryItem } from '@soul-wallet/extension-base/background/KoniTypes';
import { CRON_RECOVER_HISTORY_INTERVAL, CRON_REFRESH_HISTORY_INTERVAL } from '@soul-wallet/extension-base/constants';
import { CronServiceInterface, PersistDataServiceInterface, ServiceStatus, StoppableServiceInterface } from '@soul-wallet/extension-base/services/base/types';
import { ChainService } from '@soul-wallet/extension-base/services/chain-service';
import { EventService } from '@soul-wallet/extension-base/services/event-service';
import { historyRecover, HistoryRecoverStatus } from '@soul-wallet/extension-base/services/history-service/helpers/recoverHistoryStatus';
import { KeyringService } from '@soul-wallet/extension-base/services/keyring-service';
import DatabaseService from '@soul-wallet/extension-base/services/storage-service/DatabaseService';
import { createPromiseHandler } from '@soul-wallet/extension-base/utils/promise';
import { keyring } from '@subwallet/ui-keyring';
import { BehaviorSubject } from 'rxjs';

import { fetchMultiChainHistories } from './subsquid-multi-chain-history';

export class HistoryService implements StoppableServiceInterface, PersistDataServiceInterface, CronServiceInterface {
  private historySubject: BehaviorSubject<TransactionHistoryItem[]> = new BehaviorSubject([] as TransactionHistoryItem[]);
  #needRecoveryHistories: Record<string, TransactionHistoryItem> = {};

  constructor (private dbService: DatabaseService, private chainService: ChainService, private eventService: EventService, private keyringService: KeyringService) {
    this.init().catch(console.error);
  }

  private fetchPromise: Promise<void> | null = null;
  private interval: NodeJS.Timer | undefined = undefined;
  private recoverInterval: NodeJS.Timer | undefined = undefined;

  private async fetchAndLoadHistories (addresses: string[]): Promise<TransactionHistoryItem[]> {
    if (!addresses || addresses.length === 0) {
      return [];
    }

    const chainMap = this.chainService.getChainInfoMap();

    // Query data from subscan or any indexer
    const historyRecords = await fetchMultiChainHistories(addresses, chainMap);

    // Fill additional info
    const accountMap = Object.entries(this.keyringService.accounts).reduce((map, [address, account]) => {
      map[address.toLowerCase()] = account.json.meta.name || address;

      return map;
    }, {} as Record<string, string>);

    historyRecords.forEach((record) => {
      record.fromName = accountMap[record.from?.toLowerCase()];
      record.toName = accountMap[record.to?.toLowerCase()];
    });

    await this.addHistoryItems(historyRecords);

    return historyRecords;
  }

  public async getHistories () {
    const addressList = keyring.getAccounts().map((a) => a.address);

    if (!this.fetchPromise) {
      this.fetchPromise = (async () => {
        await this.fetchAndLoadHistories(addressList);
        const histories = await this.dbService.getHistories();

        this.historySubject.next(histories);
      })();
    }

    return Promise.resolve(this.historySubject.getValue());
  }

  public async getHistorySubject () {
    await this.getHistories();

    return this.historySubject;
  }

  async updateHistories (chain: string, extrinsicHash: string, updateData: Partial<TransactionHistoryItem>) {
    const existedRecords = await this.dbService.getHistories({ chain, extrinsicHash });
    const updatedRecords = existedRecords.map((r) => {
      return { ...r, ...updateData };
    });

    await this.addHistoryItems(updatedRecords);
  }

  async updateHistoryByExtrinsicHash (extrinsicHash: string, updateData: Partial<TransactionHistoryItem>) {
    await this.dbService.updateHistoryByExtrinsicHash(extrinsicHash, updateData);
    this.historySubject.next(await this.dbService.getHistories());
  }

  // Insert history without check override origin 'app'
  async insertHistories (historyItems: TransactionHistoryItem[]) {
    await this.dbService.upsertHistory(historyItems);
    this.historySubject.next(await this.dbService.getHistories());
  }

  // Insert history with check override origin 'app'
  async addHistoryItems (historyItems: TransactionHistoryItem[]) {
    // Prevent override record with original is 'app'
    const appRecords = this.historySubject.value.filter((item) => item.origin === 'app');
    const excludeKeys = appRecords.map((item) => {
      return `${item.chain}-${item.extrinsicHash}`;
    });

    const updateRecords = historyItems.filter((item) => {
      const key = `${item.chain}-${item.extrinsicHash}`;

      return item.origin === 'app' || !excludeKeys.includes(key);
    });

    await this.dbService.upsertHistory(updateRecords);
    this.historySubject.next(await this.dbService.getHistories());
  }

  async removeHistoryByAddress (address: string) {
    await this.dbService.stores.transaction.removeAllByAddress(address);
    this.historySubject.next(await this.dbService.getHistories());
  }

  status: ServiceStatus = ServiceStatus.NOT_INITIALIZED;

  async loadData (): Promise<void> {
    const histories = await this.dbService.getHistories();

    this.historySubject.next(histories);
  }

  async persistData (): Promise<void> {
    await this.dbService.upsertHistory(this.historySubject.value);
  }

  async startCron (): Promise<void> {
    await this.getHistories();

    this.interval = setInterval(() => {
      this.getHistories().catch(console.error);
    }, CRON_REFRESH_HISTORY_INTERVAL);
  }

  stopCron (): Promise<void> {
    clearTimeout(this.interval);
    this.fetchPromise = null;

    return Promise.resolve();
  }

  async startRecoverHistories (): Promise<void> {
    await this.recoverHistories();

    this.recoverInterval = setInterval(() => {
      this.recoverHistories().catch(console.error);
    }, CRON_RECOVER_HISTORY_INTERVAL);
  }

  stopRecoverHistories (): Promise<void> {
    clearInterval(this.recoverInterval);

    return Promise.resolve();
  }

  async recoverHistories (): Promise<void> {
    const list: TransactionHistoryItem[] = [];

    for (const processingHistory of Object.values(this.#needRecoveryHistories)) {
      const chainState = this.chainService.getChainStateByKey(processingHistory.chain);

      if (chainState.active) {
        list.push(processingHistory);
      }

      if (list.length >= 10) {
        break;
      }
    }

    const promises = list.map((history) => historyRecover(history, this.chainService));

    const results = await Promise.all(promises);

    results.forEach((recoverResult, index) => {
      const currentExtrinsicHash = list[index].extrinsicHash;

      const updateData: Partial<TransactionHistoryItem> = {
        ...recoverResult,
        status: ExtrinsicStatus.UNKNOWN
      };

      switch (recoverResult.status) {
        case HistoryRecoverStatus.API_INACTIVE:
          break;
        case HistoryRecoverStatus.FAILED:
        case HistoryRecoverStatus.SUCCESS:
          updateData.status = recoverResult.status === HistoryRecoverStatus.SUCCESS ? ExtrinsicStatus.SUCCESS : ExtrinsicStatus.FAIL;
          this.updateHistoryByExtrinsicHash(currentExtrinsicHash, updateData).catch(console.error);
          delete this.#needRecoveryHistories[currentExtrinsicHash];
          break;
        default:
          this.updateHistoryByExtrinsicHash(currentExtrinsicHash, updateData).catch(console.error);
          delete this.#needRecoveryHistories[currentExtrinsicHash];
      }
    });

    if (!Object.keys(this.#needRecoveryHistories).length) {
      await this.stopRecoverHistories();
    }
  }

  startPromiseHandler = createPromiseHandler<void>();

  async init (): Promise<void> {
    this.status = ServiceStatus.INITIALIZING;
    await this.loadData();
    Promise.all([this.eventService.waitKeyringReady, this.eventService.waitChainReady]).then(() => {
      this.getHistories().catch(console.log);
      this.recoverProcessingHistory().catch(console.error);

      this.eventService.on('account.add', () => {
        (async () => {
          await this.stopCron();
          await this.startCron();
        })().catch(console.error);
      });
      this.eventService.on('account.remove', (address) => {
        this.removeHistoryByAddress(address).catch(console.error);
      });
    }).catch(console.error);
    this.status = ServiceStatus.INITIALIZED;
  }

  async recoverProcessingHistory () {
    const histories = await this.dbService.getHistories();

    this.#needRecoveryHistories = {};

    histories.filter((history) => {
      return [ExtrinsicStatus.PROCESSING, ExtrinsicStatus.SUBMITTING].includes(history.status);
    }).forEach((history) => {
      this.#needRecoveryHistories[history.extrinsicHash] = history;
    });

    const recoverNumber = Object.keys(this.#needRecoveryHistories).length;

    if (recoverNumber > 0) {
      console.log(`Recover ${recoverNumber} processing history`);
    }

    this.startRecoverHistories().catch(console.error);
  }

  async start (): Promise<void> {
    if (this.status === ServiceStatus.STARTED) {
      return;
    }

    try {
      await Promise.all([this.eventService.waitKeyringReady, this.eventService.waitChainReady]);
      this.startPromiseHandler = createPromiseHandler<void>();
      this.status = ServiceStatus.STARTING;
      await this.startCron();
      this.status = ServiceStatus.STARTED;
      this.startPromiseHandler.resolve();
    } catch (e) {
      this.startPromiseHandler.reject(e);
    }
  }

  waitForStarted () {
    return this.startPromiseHandler.promise;
  }

  stopPromiseHandler = createPromiseHandler<void>();

  async stop (): Promise<void> {
    try {
      this.stopPromiseHandler = createPromiseHandler<void>();
      this.status = ServiceStatus.STOPPING;
      await this.persistData();
      await this.stopCron();
      await this.stopRecoverHistories();
      this.stopPromiseHandler.resolve();
      this.status = ServiceStatus.STOPPED;
    } catch (e) {
      this.stopPromiseHandler.reject(e);
    }
  }

  waitForStopped () {
    return this.stopPromiseHandler.promise;
  }
}
