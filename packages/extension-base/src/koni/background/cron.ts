// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { ApiMap, ServiceInfo } from '@subwallet/extension-base/background/KoniTypes';
import { CRON_AUTO_RECOVER_DOTSAMA_INTERVAL, CRON_GET_API_MAP_STATUS, CRON_REFRESH_CHAIN_NOMINATOR_METADATA, CRON_REFRESH_CHAIN_STAKING_METADATA, CRON_REFRESH_NFT_INTERVAL, CRON_REFRESH_STAKING_REWARD_FAST_INTERVAL, CRON_REFRESH_STAKING_REWARD_INTERVAL } from '@subwallet/extension-base/constants';
import { KoniSubscription } from '@subwallet/extension-base/koni/background/subscription';
import { _ChainConnectionStatus, _ChainState, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _isChainSupportEvmNft, _isChainSupportNativeNft, _isChainSupportSubstrateStaking, _isChainSupportWasmNft } from '@subwallet/extension-base/services/chain-service/utils';
import { EventItem, EventType } from '@subwallet/extension-base/services/event-service/types';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { waitTimeout } from '@subwallet/extension-base/utils';
import { Subject, Subscription } from 'rxjs';

import { logger as createLogger } from '@polkadot/util';
import { Logger } from '@polkadot/util/types';

import KoniState from './handlers/State';

export class KoniCron {
  subscriptions: KoniSubscription;
  public status: 'pending' | 'running' | 'stopped' = 'pending';
  private serviceSubscription: Subscription | undefined;
  public dbService: DatabaseService;
  private state: KoniState;
  private logger: Logger;

  constructor (state: KoniState, subscriptions: KoniSubscription, dbService: DatabaseService) {
    this.subscriptions = subscriptions;
    this.dbService = dbService;
    this.state = state;
    this.logger = createLogger('Cron');
    // this.init();
  }

  private cronMap: Record<string, any> = {};
  private subjectMap: Record<string, Subject<any>> = {};
  private eventHandler?: ((events: EventItem<EventType>[], eventTypes: EventType[]) => void);

  getCron = (name: string): any => {
    return this.cronMap[name];
  };

  getSubjectMap = (name: string): any => {
    return this.subjectMap[name];
  };

  addCron = (name: string, callback: (param?: any) => void, interval: number, runFirst = true) => {
    if (runFirst) {
      callback();
    }

    this.cronMap[name] = setInterval(callback, interval);
  };

  addSubscribeCron = <T>(name: string, callback: (subject: Subject<T>) => void, interval: number) => {
    const sb = new Subject<T>();

    callback(sb);
    this.subjectMap[name] = sb;
    this.cronMap[name] = setInterval(callback, interval);
  };

  removeCron = (name: string) => {
    const interval = this.cronMap[name] as number;

    if (interval) {
      clearInterval(interval);
      delete this.cronMap[name];
    }
  };

  removeAllCrons = () => {
    Object.entries(this.cronMap).forEach(([key, interval]) => {
      clearInterval(interval as number);
      delete this.cronMap[key];
    });
  };

  init = () => {
    const currentAccountInfo = this.state.keyringService.currentAccount;

    if (!currentAccountInfo?.address) {
      return;
    }

    if (Object.keys(this.state.getSubstrateApiMap()).length !== 0 || Object.keys(this.state.getEvmApiMap()).length !== 0) {
      this.refreshNft(currentAccountInfo.address, this.state.getApiMap(), this.state.getSmartContractNfts(), this.state.getActiveChainInfoMap());
      this.updateApiMapStatus();
      this.refreshStakingReward(currentAccountInfo.address);
      this.refreshStakingRewardFastInterval(currentAccountInfo.address);
      // this.updateChainStakingMetadata(this.state.getChainInfoMap(), this.state.getChainStateMap(), this.state.getSubstrateApiMap());
      this.updateNominatorMetadata(currentAccountInfo.address, this.state.getChainInfoMap(), this.state.getChainStateMap(), this.state.getSubstrateApiMap());
    } else {
      this.setStakingRewardReady();
    }
  };

  start = () => {
    if (this.status === 'running') {
      return;
    }

    this.logger.log('Starting cron jobs');
    const currentAccountInfo = this.state.keyringService.currentAccount;

    if (!currentAccountInfo?.address) {
      return;
    }

    if (Object.keys(this.state.getSubstrateApiMap()).length !== 0 || Object.keys(this.state.getEvmApiMap()).length !== 0) {
      this.resetNft(currentAccountInfo.address);
      this.addCron('refreshNft', this.refreshNft(currentAccountInfo.address, this.state.getApiMap(), this.state.getSmartContractNfts(), this.state.getActiveChainInfoMap()), CRON_REFRESH_NFT_INTERVAL);
      this.addCron('checkStatusApiMap', this.updateApiMapStatus, CRON_GET_API_MAP_STATUS);
      this.addCron('recoverApiMap', this.recoverApiMap, CRON_AUTO_RECOVER_DOTSAMA_INTERVAL, false);
      this.addCron('refreshStakingReward', this.refreshStakingReward(currentAccountInfo.address), CRON_REFRESH_STAKING_REWARD_INTERVAL);
      this.addCron('refreshPoolingStakingReward', this.refreshStakingRewardFastInterval(currentAccountInfo.address), CRON_REFRESH_STAKING_REWARD_FAST_INTERVAL);
      this.addCron('updateChainStakingMetadata', this.updateChainStakingMetadata(this.state.getChainInfoMap(), this.state.getChainStateMap(), this.state.getSubstrateApiMap()), CRON_REFRESH_CHAIN_STAKING_METADATA);
      this.addCron('updateNominatorMetadata', this.updateNominatorMetadata(currentAccountInfo.address, this.state.getChainInfoMap(), this.state.getChainStateMap(), this.state.getSubstrateApiMap()), CRON_REFRESH_CHAIN_NOMINATOR_METADATA);
    } else {
      this.setStakingRewardReady();
    }

    const reloadEvents: EventType[] = [
      'account.add',
      'account.remove',
      'account.updateCurrent',
      'chain.add',
      'chain.updateState',
      'asset.updateState'
    ];

    this.eventHandler = (events, eventTypes) => {
      const serviceInfo = this.state.getServiceInfo();
      const needReload = eventTypes.some((eventType) => reloadEvents.includes(eventType));

      const chainUpdated = eventTypes.includes('chain.updateState');
      const nftTransferred = eventTypes.includes('transaction.transferNft');
      const stakingSubmitted = eventTypes.includes('transaction.submitStaking');
      const updatedChains: string[] = [];

      if (chainUpdated) {
        events.forEach((event) => {
          if (event.type === 'chain.updateState') {
            const updatedData = event.data as [string];

            updatedChains.push(updatedData[0]);
          }
        });
      }

      if (!needReload && !chainUpdated && !nftTransferred && !stakingSubmitted) {
        return;
      }

      this.logger.log('ServiceInfo updated, Cron restarting...', eventTypes);
      const address = serviceInfo.currentAccountInfo?.address;

      if (!address) {
        return;
      }

      // NFT
      (needReload || nftTransferred) && this.resetNft(address);
      (needReload || nftTransferred) && this.removeCron('refreshNft');

      // Staking
      (needReload || stakingSubmitted) && this.resetStakingReward();
      (needReload || stakingSubmitted) && this.removeCron('refreshStakingReward');
      (needReload || stakingSubmitted) && this.removeCron('refreshPoolingStakingReward');
      chainUpdated && this.removeCron('updateChainStakingMetadata');
      (needReload || stakingSubmitted) && this.removeCron('updateNominatorMetadata');

      // Chains
      chainUpdated && this.removeCron('checkStatusApiMap');
      chainUpdated && this.removeCron('recoverApiMap');

      if (this.checkNetworkAvailable(serviceInfo)) { // only add cron job if there's at least 1 active network
        (needReload || nftTransferred) && this.addCron('refreshNft', this.refreshNft(address, serviceInfo.chainApiMap, this.state.getSmartContractNfts(), this.state.getActiveChainInfoMap(), updatedChains), CRON_REFRESH_NFT_INTERVAL);

        chainUpdated && this.addCron('checkStatusApiMap', this.updateApiMapStatus, CRON_GET_API_MAP_STATUS);
        chainUpdated && this.addCron('recoverApiMap', this.recoverApiMap, CRON_AUTO_RECOVER_DOTSAMA_INTERVAL, false);

        (needReload || stakingSubmitted) && this.addCron('refreshStakingReward', this.refreshStakingReward(address, updatedChains), CRON_REFRESH_STAKING_REWARD_INTERVAL);
        (needReload || stakingSubmitted) && this.addCron('refreshPoolingStakingReward', this.refreshStakingRewardFastInterval(address, updatedChains), CRON_REFRESH_STAKING_REWARD_FAST_INTERVAL);
        chainUpdated && this.addCron('updateChainStakingMetadata', this.updateChainStakingMetadata(serviceInfo.chainInfoMap, serviceInfo.chainStateMap, serviceInfo.chainApiMap.substrate, updatedChains), CRON_REFRESH_CHAIN_STAKING_METADATA);
        (needReload || stakingSubmitted) && this.addCron('updateNominatorMetadata', this.updateNominatorMetadata(address, serviceInfo.chainInfoMap, serviceInfo.chainStateMap, serviceInfo.chainApiMap.substrate, updatedChains), CRON_REFRESH_CHAIN_NOMINATOR_METADATA);
      } else {
        this.setStakingRewardReady();
      }
    };

    this.state.eventService.onLazy(this.eventHandler);

    this.status = 'running';
  };

  stop = () => {
    if (this.status === 'stopped') {
      return;
    }

    // Unsubscribe events
    if (this.eventHandler) {
      this.state.eventService.offLazy(this.eventHandler);
      this.eventHandler = undefined;
    }

    if (this.serviceSubscription) {
      this.serviceSubscription.unsubscribe();
      this.serviceSubscription = undefined;
    }

    this.logger.log('Stopping cron jobs');
    this.removeAllCrons();

    this.status = 'stopped';
  };

  updateApiMapStatus = () => {
    const apiMap = this.state.getApiMap();
    const networkMap = this.state.getChainStateMap();

    for (const [key, substrateApi] of Object.entries(apiMap.substrate)) {
      let status: _ChainConnectionStatus = _ChainConnectionStatus.CONNECTING;

      if (substrateApi.isApiConnected) {
        status = _ChainConnectionStatus.CONNECTED;
      }

      if (!networkMap[key].connectionStatus) {
        this.state.updateChainConnectionStatus(key, status);
      } else if (networkMap[key].connectionStatus && networkMap[key].connectionStatus !== status) {
        this.state.updateChainConnectionStatus(key, status);
      }
    }

    for (const [key, evmApi] of Object.entries(apiMap.evm)) {
      evmApi.api.eth.net.isListening()
        .then(() => {
          if (!networkMap[key].connectionStatus) {
            this.state.updateChainConnectionStatus(key, _ChainConnectionStatus.CONNECTED);
          } else if (networkMap[key].connectionStatus && networkMap[key].connectionStatus !== _ChainConnectionStatus.CONNECTED) {
            this.state.updateChainConnectionStatus(key, _ChainConnectionStatus.CONNECTED);
          }
        })
        .catch(() => {
          if (!networkMap[key].connectionStatus) {
            this.state.updateChainConnectionStatus(key, _ChainConnectionStatus.CONNECTING);
          } else if (networkMap[key].connectionStatus && networkMap[key].connectionStatus !== _ChainConnectionStatus.CONNECTING) {
            this.state.updateChainConnectionStatus(key, _ChainConnectionStatus.CONNECTING);
          }
        });
    }
  };

  recoverApiMap = () => {
    const apiMap = this.state.getApiMap();

    for (const [networkKey, apiProp] of Object.entries(apiMap.substrate)) {
      if (!apiProp.isApiConnected) {
        this.state.refreshSubstrateApi(networkKey);
      }
    }

    for (const [key, evmApi] of Object.entries(apiMap.evm)) {
      evmApi.api.eth.net.isListening()
        .catch(() => {
          this.state.refreshWeb3Api(key);
        });
    }

    const { address } = this.state.keyringService.currentAccount;

    this.subscriptions?.subscribeBalancesAndCrowdloans && this.subscriptions.subscribeBalancesAndCrowdloans(address, this.state.getChainInfoMap(), this.state.getChainStateMap(), this.state.getSubstrateApiMap(), this.state.getEvmApiMap());
  };

  refreshNft = (address: string, apiMap: ApiMap, smartContractNfts: _ChainAsset[], chainInfoMap: Record<string, _ChainInfo>, updatedChains?: string[]) => {
    return () => {
      if (updatedChains && updatedChains.length > 0) {
        const updatedChainSupportStaking = updatedChains.some((updatedChain) => {
          const chainInfo = chainInfoMap[updatedChain];

          return chainInfo && (_isChainSupportNativeNft(chainInfo) || _isChainSupportEvmNft(chainInfo) || _isChainSupportWasmNft(chainInfo));
        });

        if (!updatedChainSupportStaking) {
          return;
        }
      }

      console.debug('Refresh NFT state');
      this.subscriptions.subscribeNft(address, apiMap.substrate, apiMap.evm, smartContractNfts, chainInfoMap);
    };
  };

  resetNft = (newAddress: string) => {
    this.state.resetNft(newAddress);
  };

  resetStakingReward = () => {
    this.state.resetStakingReward();
  };

  refreshStakingReward = (address: string, updatedChains?: string[]) => {
    return () => {
      const chainInfoMap = this.state.getChainInfoMap();

      if (updatedChains && updatedChains.length > 0) {
        const updatedChainSupportStaking = updatedChains.some((updatedChain) => chainInfoMap[updatedChain] && _isChainSupportSubstrateStaking(chainInfoMap[updatedChain]));

        if (!updatedChainSupportStaking) {
          return;
        }
      }

      console.debug('Refresh staking reward state');
      this.subscriptions.subscribeStakingReward(address)
        .catch(this.logger.error);
    };
  };

  refreshStakingRewardFastInterval = (address: string, updatedChains?: string[]) => {
    return () => {
      const chainInfoMap = this.state.getChainInfoMap();

      if (updatedChains && updatedChains.length > 0) {
        const updatedChainSupportStaking = updatedChains.some((updatedChain) => chainInfoMap[updatedChain] && _isChainSupportSubstrateStaking(chainInfoMap[updatedChain]));

        if (!updatedChainSupportStaking) {
          return;
        }
      }

      console.debug('Refresh staking reward data with fast interval');
      this.subscriptions.subscribeStakingRewardFastInterval(address)
        .catch(this.logger.error);
    };
  };

  setStakingRewardReady = () => {
    this.state.updateStakingRewardReady(true);
  };

  checkNetworkAvailable = (serviceInfo: ServiceInfo): boolean => {
    return Object.keys(serviceInfo.chainApiMap.substrate).length > 0 || Object.keys(serviceInfo.chainApiMap.evm).length > 0;
  };

  updateChainStakingMetadata = (chainInfoMap: Record<string, _ChainInfo>, chainStateMap: Record<string, _ChainState>, substrateApiMap: Record<string, _SubstrateApi>, updatedChains?: string[]) => {
    return () => {
      if (updatedChains && updatedChains.length > 0) {
        const updatedChainSupportStaking = updatedChains.some((updatedChain) => chainInfoMap[updatedChain] && _isChainSupportSubstrateStaking(chainInfoMap[updatedChain]));

        if (!updatedChainSupportStaking) {
          return;
        }
      }

      console.debug('Fetching chain staking metadata');

      this.subscriptions.fetchChainStakingMetadata(chainInfoMap, chainStateMap, substrateApiMap)
        .catch(this.logger.error);
    };
  };

  updateNominatorMetadata = (address: string, chainInfoMap: Record<string, _ChainInfo>, chainStateMap: Record<string, _ChainState>, substrateApiMap: Record<string, _SubstrateApi>, updatedChains?: string[]) => {
    return () => {
      if (updatedChains && updatedChains.length > 0) {
        const updatedChainSupportStaking = updatedChains.some((updatedChain) => chainInfoMap[updatedChain] && _isChainSupportSubstrateStaking(chainInfoMap[updatedChain]));

        if (!updatedChainSupportStaking) {
          return;
        }
      }

      console.debug('Fetching nominator data for', address);

      this.subscriptions.fetchNominatorMetadata(address, chainInfoMap, chainStateMap, substrateApiMap)
        .catch(this.logger.error);
    };
  };

  public async reloadNft () {
    const address = this.state.keyringService.currentAccount.address;
    const serviceInfo = this.state.getServiceInfo();

    console.debug('Hard refresh NFT for', address);

    this.resetNft(address);
    this.removeCron('refreshNft');
    this.addCron('refreshNft', this.refreshNft(address, serviceInfo.chainApiMap, this.state.getSmartContractNfts(), this.state.getActiveChainInfoMap()), CRON_REFRESH_NFT_INTERVAL);

    await waitTimeout(1800);

    return true;
  }

  public async reloadStaking () {
    const address = this.state.keyringService.currentAccount.address;

    console.debug('Hard refresh staking meta for', address);

    this.resetStakingReward();
    this.removeCron('refreshStakingReward');
    this.removeCron('refreshPoolingStakingReward');
    this.removeCron('updateNominatorMetadata');
    this.addCron('refreshStakingReward', this.refreshStakingReward(address), CRON_REFRESH_STAKING_REWARD_INTERVAL);
    this.addCron('refreshPoolingStakingReward', this.refreshStakingRewardFastInterval(address), CRON_REFRESH_STAKING_REWARD_FAST_INTERVAL);
    this.addCron('updateNominatorMetadata', this.updateNominatorMetadata(address, this.state.getChainInfoMap(), this.state.getChainStateMap(), this.state.getSubstrateApiMap()), CRON_REFRESH_CHAIN_NOMINATOR_METADATA);

    await waitTimeout(1800);

    return true;
  }
}
