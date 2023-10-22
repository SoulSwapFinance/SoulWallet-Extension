// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AssetLogoMap, AssetRefMap, ChainAssetMap, ChainInfoMap, ChainLogoMap, MultiChainAssetMap } from '@soul-wallet/chain-list';
import { _AssetRef, _AssetRefPath, _AssetType, _ChainAsset, _ChainInfo, _ChainStatus, _EvmInfo, _MultiChainAsset, _SubstrateChainType, _SubstrateInfo } from '@soul-wallet/chain-list/types';
import { AssetSetting, ValidateNetworkResponse } from 'background/KoniTypes';
import { _ASSET_LOGO_MAP_SRC, _ASSET_REF_SRC, _CHAIN_ASSET_SRC, _CHAIN_INFO_SRC, _CHAIN_LOGO_MAP_SRC, _DEFAULT_ACTIVE_CHAINS, _MANTA_ZK_CHAIN_GROUP, _MULTI_CHAIN_ASSET_SRC, _ZK_ASSET_PREFIX } from 'services/chain-service/constants';
import { EvmChainHandler } from 'services/chain-service/handler/EvmChainHandler';
import { MantaPrivateHandler } from 'services/chain-service/handler/manta/MantaPrivateHandler';
import { SubstrateChainHandler } from 'services/chain-service/handler/SubstrateChainHandler';
import { _CHAIN_VALIDATION_ERROR } from 'services/chain-service/handler/types';
import { _ChainConnectionStatus, _ChainState, _CUSTOM_PREFIX, _DataMap, _EvmApi, _NetworkUpsertParams, _NFT_CONTRACT_STANDARDS, _SMART_CONTRACT_STANDARDS, _SmartContractTokenInfo, _SubstrateApi, _ValidateCustomAssetRequest, _ValidateCustomAssetResponse } from 'services/chain-service/types';
import { _isAssetFungibleToken, _isChainEnabled, _isCustomAsset, _isCustomChain, _isEqualContractAddress, _isEqualSmartContractAsset, _isMantaZkAsset, _isPureEvmChain, _isPureSubstrateChain, _parseAssetRefKey } from 'services/chain-service/utils';
import { EventService } from 'services/event-service';
import { IChain, IMetadataItem } from 'services/storage-service/databases';
import DatabaseService from 'services/storage-service/DatabaseService';
import AssetSettingStore from 'stores/AssetSetting';
import { MODULE_SUPPORT } from 'utils';
import { BehaviorSubject, Subject } from 'rxjs';
import Web3 from 'web3';

import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

export class ChainService {
  private dataMap: _DataMap = {
    chainInfoMap: {},
    chainStateMap: {},
    assetRegistry: {},
    assetRefMap: {}
  };

  private dbService: DatabaseService; // to save chain, token settings from user
  private eventService: EventService;

  private lockChainInfoMap = false; // prevent unwanted changes (edit, enable, disable) to chainInfoMap

  private substrateChainHandler: SubstrateChainHandler;
  private evmChainHandler: EvmChainHandler;
  private mantaChainHandler: MantaPrivateHandler | undefined;

  public get mantaPay () {
    return this.mantaChainHandler;
  }

  // TODO: consider BehaviorSubject
  private chainInfoMapSubject = new Subject<Record<string, _ChainInfo>>();
  private chainStateMapSubject = new Subject<Record<string, _ChainState>>();
  private assetRegistrySubject = new Subject<Record<string, _ChainAsset>>();
  private multiChainAssetMapSubject = new Subject<Record<string, _MultiChainAsset>>();
  private xcmRefMapSubject = new Subject<Record<string, _AssetRef>>();

  // Todo: Update to new store indexed DB
  private store: AssetSettingStore = new AssetSettingStore();
  private assetSettingSubject = new BehaviorSubject({} as Record<string, AssetSetting>);

  private logger: Logger;

  constructor (dbService: DatabaseService, eventService: EventService) {
    this.dbService = dbService;
    this.eventService = eventService;

    this.chainInfoMapSubject.next(this.dataMap.chainInfoMap);
    this.chainStateMapSubject.next(this.dataMap.chainStateMap);
    this.assetRegistrySubject.next(this.dataMap.assetRegistry);
    this.xcmRefMapSubject.next(this.dataMap.assetRefMap);

    if (MODULE_SUPPORT.MANTA_ZK) {
      console.log('Init Manta ZK');
      this.mantaChainHandler = new MantaPrivateHandler(dbService);
    }

    this.substrateChainHandler = new SubstrateChainHandler(this);
    this.evmChainHandler = new EvmChainHandler(this);

    this.logger = createLogger('chain-service');
  }

  // Getter
  public getXcmRefMap () {
    return this.dataMap.assetRefMap;
    // const result: Record<string, _AssetRef> = {};
    //
    // Object.entries(AssetRefMap).forEach(([key, assetRef]) => {
    //   if (assetRef.path === _AssetRefPath.XCM) {
    //     result[key] = assetRef;
    //   }
    // });
    //
    // return result;
  }

  public getEvmApi (slug: string) {
    return this.evmChainHandler.getEvmApiByChain(slug);
  }

  public getEvmApiMap () {
    return this.evmChainHandler.getEvmApiMap();
  }

  public getSubstrateApiMap () {
    return this.substrateChainHandler.getSubstrateApiMap();
  }

  public getSubstrateApi (slug: string) {
    return this.substrateChainHandler.getSubstrateApiByChain(slug);
  }

  public getChainCurrentProviderByKey (slug: string) {
    const providerName = this.getChainStateByKey(slug).currentProvider;
    const providerMap = this.getChainInfoByKey(slug).providers;
    const endpoint = providerMap[providerName];

    return {
      endpoint,
      providerName
    };
  }

  public subscribeChainInfoMap () {
    return this.chainInfoMapSubject;
  }

  public subscribeAssetRegistry () {
    return this.assetRegistrySubject;
  }

  public subscribeMultiChainAssetMap () {
    return this.multiChainAssetMapSubject;
  }

  public subscribeXcmRefMap () {
    return this.xcmRefMapSubject;
  }

  public subscribeChainStateMap () {
    return this.chainStateMapSubject;
  }

  public getAssetRegistry () {
    return this.dataMap.assetRegistry;
  }

  public getMultiChainAssetMap () {
    return MultiChainAssetMap;
  }

  public getSmartContractTokens () {
    const filteredAssetRegistry: Record<string, _ChainAsset> = {};

    Object.values(this.getAssetRegistry()).forEach((asset) => {
      if (_SMART_CONTRACT_STANDARDS.includes(asset.assetType)) {
        filteredAssetRegistry[asset.slug] = asset;
      }
    });

    return filteredAssetRegistry;
  }

  public getChainInfoMap (): Record<string, _ChainInfo> {
    return this.dataMap.chainInfoMap;
  }

  public getEvmChainInfoMap (): Record<string, _ChainInfo> {
    const result: Record<string, _ChainInfo> = {};

    Object.values(this.getChainInfoMap()).forEach((chainInfo) => {
      if (_isPureEvmChain(chainInfo)) {
        result[chainInfo.slug] = chainInfo;
      }
    });

    return result;
  }

  public getSubstrateChainInfoMap (): Record<string, _ChainInfo> {
    const result: Record<string, _ChainInfo> = {};

    Object.values(this.getChainInfoMap()).forEach((chainInfo) => {
      if (_isPureSubstrateChain(chainInfo)) {
        result[chainInfo.slug] = chainInfo;
      }
    });

    return result;
  }

  public getAllPriceIds () {
    const result: string[] = [];

    Object.values(this.getAssetRegistry()).forEach((assetInfo) => {
      if (assetInfo.priceId !== null) {
        result.push(assetInfo.priceId);
      }
    });

    return result;
  }

  public getNativeTokenInfo (chainSlug: string) {
    let nativeTokenInfo: _ChainAsset = {
      assetType: _AssetType.NATIVE,
      decimals: 0,
      metadata: null,
      minAmount: '',
      multiChainAsset: '',
      name: '',
      originChain: '',
      priceId: '',
      slug: '',
      symbol: '',
      hasValue: true,
      icon: ''
    };

    for (const assetInfo of Object.values(this.getAssetRegistry())) {
      if (assetInfo.assetType === _AssetType.NATIVE && assetInfo.originChain === chainSlug) {
        nativeTokenInfo = assetInfo;
        break;
      }
    }

    return nativeTokenInfo;
  }

  public getAssetRefMap () {
    return this.dataMap.assetRefMap;
  }

  public getChainStateMap () {
    return this.dataMap.chainStateMap;
  }

  public getChainStateByKey (key: string) {
    return this.dataMap.chainStateMap[key];
  }

  public getActiveChains () {
    return Object.entries(this.dataMap.chainStateMap)
      .filter(([, chainState]) => _isChainEnabled(chainState))
      .map(([key]) => key);
  }

  public getSupportedSmartContractTypes () {
    return [_AssetType.ERC20, _AssetType.ERC721, _AssetType.PSP22, _AssetType.PSP34];
  }

  public getActiveChainInfoMap () {
    const result: Record<string, _ChainInfo> = {};

    Object.values(this.getChainInfoMap()).forEach((chainInfo) => {
      const chainState = this.getChainStateByKey(chainInfo.slug);

      if (_isChainEnabled(chainState)) {
        result[chainInfo.slug] = chainInfo;
      }
    });

    return result;
  }

  public getActiveChainSlugs () {
    const result: string[] = [];

    Object.values(this.getChainInfoMap()).forEach((chainInfo) => {
      const chainState = this.getChainStateByKey(chainInfo.slug);

      if (_isChainEnabled(chainState)) {
        result.push(chainInfo.slug);
      }
    });

    return result;
  }

  public getChainInfoByKey (key: string): _ChainInfo {
    return this.dataMap.chainInfoMap[key];
  }

  public getActiveChainInfos () {
    const result: Record<string, _ChainInfo> = {};

    Object.values(this.getChainStateMap()).forEach((chainState) => {
      if (chainState.active) {
        result[chainState.slug] = this.getChainInfoByKey(chainState.slug);
      }
    });

    return result;
  }

  public getAssetBySlug (slug: string): _ChainAsset {
    return this.getAssetRegistry()[slug];
  }

  public getMantaZkAssets (chain: string): Record<string, _ChainAsset> {
    const result: Record<string, _ChainAsset> = {};

    Object.values(this.getAssetRegistry()).forEach((chainAsset) => {
      if (chainAsset.originChain === chain && _isAssetFungibleToken(chainAsset) && chainAsset.symbol.startsWith(_ZK_ASSET_PREFIX)) {
        result[chainAsset.slug] = chainAsset;
      }
    });

    return result;
  }

  public getFungibleTokensByChain (chainSlug: string, checkActive = false): Record<string, _ChainAsset> {
    const result: Record<string, _ChainAsset> = {};
    const assetSettings = this.assetSettingSubject.value;

    Object.values(this.getAssetRegistry()).forEach((chainAsset) => {
      const _filterActive = !checkActive || assetSettings[chainAsset.slug]?.visible;

      if (chainAsset.originChain === chainSlug && _isAssetFungibleToken(chainAsset) && _filterActive) {
        result[chainAsset.slug] = chainAsset;
      }
    });

    return result;
  }

  public getXcmEqualAssetByChain (destinationChainSlug: string, originTokenSlug: string) {
    let destinationTokenInfo: _ChainAsset | undefined;

    for (const asset of Object.values(this.getAssetRegistry())) {
      if (asset.originChain === destinationChainSlug) { // check
        const assetRefKey = _parseAssetRefKey(originTokenSlug, asset.slug);
        const assetRef = this.getAssetRefMap()[assetRefKey];

        if (assetRef && assetRef.path === _AssetRefPath.XCM) { // there's only 1 corresponding token on 1 chain
          destinationTokenInfo = asset;
          break;
        }
      }
    }

    return destinationTokenInfo;
  }

  public getAssetByChainAndType (chainSlug: string, assetTypes: _AssetType[]) {
    const result: Record<string, _ChainAsset> = {};

    Object.values(this.getAssetRegistry()).forEach((assetInfo) => {
      if (assetTypes.includes(assetInfo.assetType) && assetInfo.originChain === chainSlug) {
        result[assetInfo.slug] = assetInfo;
      }
    });

    return result;
  }

  public getSmartContractNfts () {
    const result: _ChainAsset[] = [];

    Object.values(this.getAssetRegistry()).forEach((assetInfo) => {
      if (_NFT_CONTRACT_STANDARDS.includes(assetInfo.assetType)) {
        result.push(assetInfo);
      }
    });

    return result;
  }

  // Setter
  public forceRemoveChain (slug: string) {
    if (this.lockChainInfoMap) {
      return false;
    }

    const chainInfoMap = this.getChainInfoMap();
    const chainStateMap = this.getChainStateMap();

    if (!(slug in chainInfoMap)) {
      return false;
    }

    this.lockChainInfoMap = true;

    delete chainStateMap[slug];
    delete chainInfoMap[slug];
    this.deleteAssetsByChain(slug);
    this.dbService.removeFromChainStore([slug]).catch(console.error);

    this.updateChainSubscription();

    this.lockChainInfoMap = false;

    this.eventService.emit('chain.updateState', slug);

    return true;
  }

  public removeCustomChain (slug: string) {
    if (this.lockChainInfoMap) {
      return false;
    }

    const chainInfoMap = this.getChainInfoMap();
    const chainStateMap = this.getChainStateMap();

    if (!(slug in chainInfoMap)) {
      return false;
    }

    if (!_isCustomChain(slug)) {
      return false;
    }

    if (chainStateMap[slug].active) {
      return false;
    }

    this.lockChainInfoMap = true;

    delete chainStateMap[slug];
    delete chainInfoMap[slug];
    this.deleteAssetsByChain(slug);
    this.dbService.removeFromChainStore([slug]).catch(console.error);

    this.updateChainSubscription();

    this.lockChainInfoMap = false;

    this.eventService.emit('chain.updateState', slug);

    return true;
  }

  public resetChainInfoMap (excludedChains?: string[]) {
    if (this.lockChainInfoMap) {
      return false;
    }

    this.lockChainInfoMap = true;

    const chainStateMap = this.getChainStateMap();

    for (const [slug, chainState] of Object.entries(chainStateMap)) {
      if (!_DEFAULT_ACTIVE_CHAINS.includes(slug) && !excludedChains?.includes(slug)) {
        chainState.active = false;
      }
    }

    this.updateChainStateMapSubscription();

    this.lockChainInfoMap = false;

    return true;
  }

  public setChainConnectionStatus (slug: string, connectionStatus: _ChainConnectionStatus) {
    const chainStateMap = this.getChainStateMap();

    chainStateMap[slug].connectionStatus = connectionStatus;
  }

  public upsertCustomToken (token: _ChainAsset) {
    if (token.slug.length === 0) { // new token
      if (token.assetType === _AssetType.NATIVE) {
        const defaultSlug = this.generateSlugForNativeToken(token.originChain, token.assetType, token.symbol);

        token.slug = `${_CUSTOM_PREFIX}${defaultSlug}`;
      } else {
        const defaultSlug = this.generateSlugForSmartContractAsset(token.originChain, token.assetType, token.symbol, token.metadata?.contractAddress as string);

        token.slug = `${_CUSTOM_PREFIX}${defaultSlug}`;
      }
    }

    if (token.originChain && _isAssetFungibleToken(token)) {
      token.hasValue = !(this.getChainInfoByKey(token.originChain)?.isTestnet);
    }

    const assetRegistry = this.getAssetRegistry();

    assetRegistry[token.slug] = token;

    this.dbService.updateAssetStore(token).catch((e) => this.logger.error(e));

    this.assetRegistrySubject.next(assetRegistry);

    return token.slug;
  }

  public deleteAssetsByChain (chainSlug: string) {
    if (!_isCustomChain(chainSlug)) {
      return;
    }

    const targetAssets: string[] = [];
    const assetRegistry = this.getAssetRegistry();

    Object.values(assetRegistry).forEach((targetToken) => {
      if (targetToken.originChain === chainSlug) {
        targetAssets.push(targetToken.slug);
      }
    });

    this.deleteCustomAssets(targetAssets);
  }

  public deleteCustomAssets (targetAssets: string[]) {
    const assetRegistry = this.getAssetRegistry();

    targetAssets.forEach((targetToken) => {
      delete assetRegistry[targetToken];
    });

    this.dbService.removeFromBalanceStore(targetAssets).catch((e) => this.logger.error(e));
    this.dbService.removeFromAssetStore(targetAssets).catch((e) => this.logger.error(e));

    this.assetRegistrySubject.next(assetRegistry);
    targetAssets.forEach((assetSlug) => {
      this.eventService.emit('asset.updateState', assetSlug);
    });
  }

  // Business logic
  public async init () {
    await this.eventService.waitDatabaseReady;

    // TODO: reconsider the flow of initiation
    const [latestAssetRefMap, latestMultiChainAssetMap] = await Promise.all([
      this.fetchLatestData(_ASSET_REF_SRC, AssetRefMap),
      this.fetchLatestData(_MULTI_CHAIN_ASSET_SRC, MultiChainAssetMap)
    ]);

    this.multiChainAssetMapSubject.next(latestMultiChainAssetMap as Record<string, _MultiChainAsset>);
    this.dataMap.assetRefMap = latestAssetRefMap as Record<string, _AssetRef>;

    await this.initChains();
    this.chainInfoMapSubject.next(this.getChainInfoMap());
    this.updateChainStateMapSubscription();
    this.assetRegistrySubject.next(this.getAssetRegistry());
    this.xcmRefMapSubject.next(this.dataMap.assetRefMap);

    await this.initApis();
    await this.initAssetSettings();
  }

  private async initApis () {
    const chainInfoMap = this.getChainInfoMap();
    const chainStateMap = this.getChainStateMap();

    await Promise.all(Object.entries(chainInfoMap)
      .filter(([slug]) => chainStateMap[slug]?.active)
      .map(([, chainInfo]) => {
        try {
          return this.initApiForChain(chainInfo);
        } catch (e) {
          console.error(e);

          return Promise.resolve();
        }
      }));
  }

  private async initApiForChain (chainInfo: _ChainInfo) {
    const { endpoint, providerName } = this.getChainCurrentProviderByKey(chainInfo.slug);

    const onUpdateStatus = (status: _ChainConnectionStatus) => {
      const currentStatus = this.getChainStateByKey(chainInfo.slug).connectionStatus;

      // Avoid unnecessary update in case disable chain
      if (currentStatus !== status) {
        this.setChainConnectionStatus(chainInfo.slug, status);
        this.updateChainStateMapSubscription();
      }
    };

    if (chainInfo.substrateInfo !== null && chainInfo.substrateInfo !== undefined) {
      if (_MANTA_ZK_CHAIN_GROUP.includes(chainInfo.slug) && MODULE_SUPPORT.MANTA_ZK && this.mantaChainHandler) {
        const apiPromise = await this.mantaChainHandler?.initMantaPay(endpoint, chainInfo.slug);
        const chainApi = await this.substrateChainHandler.initApi(chainInfo.slug, endpoint, { providerName, externalApiPromise: apiPromise, onUpdateStatus });

        this.substrateChainHandler.setSubstrateApi(chainInfo.slug, chainApi);
      } else {
        const chainApi = await this.substrateChainHandler.initApi(chainInfo.slug, endpoint, { providerName, onUpdateStatus });

        this.substrateChainHandler.setSubstrateApi(chainInfo.slug, chainApi);
      }
    }

    if (chainInfo.evmInfo !== null && chainInfo.evmInfo !== undefined) {
      const chainApi = await this.evmChainHandler.initApi(chainInfo.slug, endpoint, { providerName, onUpdateStatus });

      this.evmChainHandler.setEvmApi(chainInfo.slug, chainApi);
    }
  }

  private destroyApiForChain (chainInfo: _ChainInfo) {
    if (chainInfo.substrateInfo !== null) {
      this.substrateChainHandler.destroySubstrateApi(chainInfo.slug);
    }

    if (chainInfo.evmInfo !== null) {
      this.evmChainHandler.destroyEvmApi(chainInfo.slug);
    }
  }

  public async enableChain (chainSlug: string) {
    const chainInfo = this.getChainInfoByKey(chainSlug);
    const chainStateMap = this.getChainStateMap();

    if (chainStateMap[chainSlug].active || this.lockChainInfoMap) {
      return false;
    }

    this.lockChainInfoMap = true;

    this.dbService.updateChainStore({
      ...chainInfo,
      active: true,
      currentProvider: chainStateMap[chainSlug].currentProvider
    }).catch(console.error);
    chainStateMap[chainSlug].active = true;

    await this.initApiForChain(chainInfo);

    this.lockChainInfoMap = false;

    this.eventService.emit('chain.updateState', chainSlug);

    this.updateChainStateMapSubscription();

    return true;
  }

  public async enableChains (chainSlugs: string[]): Promise<boolean> {
    const chainInfoMap = this.getChainInfoMap();
    const chainStateMap = this.getChainStateMap();
    let needUpdate = false;

    if (this.lockChainInfoMap) {
      return false;
    }

    this.lockChainInfoMap = true;

    const initPromises = chainSlugs.map(async (chainSlug) => {
      const chainInfo = chainInfoMap[chainSlug];
      const currentState = chainStateMap[chainSlug]?.active;

      if (!currentState) {
        this.dbService.updateChainStore({
          ...chainInfo,
          active: true,
          currentProvider: chainStateMap[chainSlug].currentProvider
        }).catch(console.error);

        chainStateMap[chainSlug].active = true;
        await this.initApiForChain(chainInfo);

        this.eventService.emit('chain.updateState', chainSlug);
        needUpdate = true;
      }
    });

    await Promise.all(initPromises);

    this.lockChainInfoMap = false;
    needUpdate && this.updateChainStateMapSubscription();

    return needUpdate;
  }

  public async reconnectChain (chain: string) {
    await this.getSubstrateApi(chain)?.recoverConnect();
    await this.getEvmApi(chain)?.recoverConnect();

    return true;
  }

  public disableChain (chainSlug: string): boolean {
    const chainInfo = this.getChainInfoByKey(chainSlug);
    const chainStateMap = this.getChainStateMap();

    if (!chainStateMap[chainSlug].active || this.lockChainInfoMap) {
      return false;
    }

    this.lockChainInfoMap = true;
    chainStateMap[chainSlug].active = false;
    // Set disconnect state for inactive chain
    chainStateMap[chainSlug].connectionStatus = _ChainConnectionStatus.DISCONNECTED;
    this.destroyApiForChain(chainInfo);

    this.dbService.updateChainStore({
      ...chainInfo,
      active: false,
      currentProvider: chainStateMap[chainSlug].currentProvider
    }).catch(console.error);

    this.updateChainStateMapSubscription();
    this.lockChainInfoMap = false;

    this.eventService.emit('chain.updateState', chainSlug);

    return true;
  }

  private checkExistedPredefinedChain (latestChainInfoMap: Record<string, _ChainInfo>, genesisHash?: string, evmChainId?: number) {
    let duplicatedSlug = '';

    if (genesisHash) {
      Object.values(latestChainInfoMap).forEach((chainInfo) => {
        if (chainInfo.substrateInfo && chainInfo.substrateInfo.genesisHash === genesisHash) {
          duplicatedSlug = chainInfo.slug;
        }
      });
    } else if (evmChainId) {
      Object.values(latestChainInfoMap).forEach((chainInfo) => {
        if (chainInfo.evmInfo && chainInfo.evmInfo.evmChainId === evmChainId) {
          duplicatedSlug = chainInfo.slug;
        }
      });
    }

    return duplicatedSlug;
  }

  private async fetchLatestData (src: string, defaultValue: unknown) {
    return Promise.resolve(defaultValue);
    // try {
    //   const timeout = new Promise((resolve) => {
    //     const id = setTimeout(() => {
    //       clearTimeout(id);
    //       resolve(null);
    //     }, 1500);
    //   });
    //   let result = defaultValue;
    //   const resp = await Promise.race([
    //     timeout,
    //     fetch(src)
    //   ]) as Response || null;
    //
    //   if (!resp) {
    //     console.warn('Error fetching latest data', src);
    //
    //     return result;
    //   }
    //
    //   if (resp.ok) {
    //     try {
    //       result = await resp.json();
    //       console.log('Fetched latest data', src);
    //     } catch (err) {
    //       console.warn('Error parsing latest data', src, err);
    //     }
    //   }
    //
    //   return result;
    // } catch (e) {
    //   console.warn('Error fetching latest data', src, e);
    //
    //   return defaultValue;
    // }
  }

  private async initChains () {
    const storedChainSettings = await this.dbService.getAllChainStore();
    const latestChainInfoMap = await this.fetchLatestData(_CHAIN_INFO_SRC, ChainInfoMap) as Record<string, _ChainInfo>;
    const storedChainSettingMap: Record<string, IChain> = {};

    storedChainSettings.forEach((chainStoredSetting) => {
      storedChainSettingMap[chainStoredSetting.slug] = chainStoredSetting;
    });

    const newStorageData: IChain[] = [];
    const deprecatedChains: string[] = [];
    const deprecatedChainMap: Record<string, string> = {};

    if (storedChainSettings.length === 0) {
      this.dataMap.chainInfoMap = latestChainInfoMap;
      Object.values(latestChainInfoMap).forEach((chainInfo) => {
        this.dataMap.chainStateMap[chainInfo.slug] = {
          currentProvider: Object.keys(chainInfo.providers)[0],
          slug: chainInfo.slug,
          connectionStatus: _ChainConnectionStatus.DISCONNECTED,
          active: _DEFAULT_ACTIVE_CHAINS.includes(chainInfo.slug)
        };

        // create data for storage
        newStorageData.push({
          ...chainInfo,
          active: _DEFAULT_ACTIVE_CHAINS.includes(chainInfo.slug),
          currentProvider: Object.keys(chainInfo.providers)[0]
        });
      });
    } else {
      const mergedChainInfoMap: Record<string, _ChainInfo> = latestChainInfoMap;

      for (const [storedSlug, storedChainInfo] of Object.entries(storedChainSettingMap)) {
        if (storedSlug in latestChainInfoMap) { // check predefined chains first, keep setting for providers and currentProvider
          mergedChainInfoMap[storedSlug].providers = { ...storedChainInfo.providers, ...mergedChainInfoMap[storedSlug].providers }; // TODO: review merging providers
          this.dataMap.chainStateMap[storedSlug] = {
            currentProvider: storedChainInfo.currentProvider,
            slug: storedSlug,
            connectionStatus: _ChainConnectionStatus.DISCONNECTED,
            active: storedChainInfo.active
          };

          newStorageData.push({
            ...mergedChainInfoMap[storedSlug],
            active: storedChainInfo.active,
            currentProvider: storedChainInfo.currentProvider
          });
        } else { // only custom chains are left
          // check custom chain duplicated with predefined chain => merge into predefined chain
          const duplicatedDefaultSlug = this.checkExistedPredefinedChain(latestChainInfoMap, storedChainInfo.substrateInfo?.genesisHash, storedChainInfo.evmInfo?.evmChainId);

          if (duplicatedDefaultSlug.length > 0) { // merge custom chain with existed chain
            mergedChainInfoMap[duplicatedDefaultSlug].providers = { ...storedChainInfo.providers, ...mergedChainInfoMap[duplicatedDefaultSlug].providers };
            this.dataMap.chainStateMap[duplicatedDefaultSlug] = {
              currentProvider: storedChainInfo.currentProvider,
              slug: duplicatedDefaultSlug,
              connectionStatus: _ChainConnectionStatus.DISCONNECTED,
              active: storedChainInfo.active
            };

            newStorageData.push({
              ...mergedChainInfoMap[duplicatedDefaultSlug],
              active: storedChainInfo.active,
              currentProvider: storedChainInfo.currentProvider
            });

            deprecatedChainMap[storedSlug] = duplicatedDefaultSlug;

            deprecatedChains.push(storedSlug);
          } else {
            mergedChainInfoMap[storedSlug] = {
              slug: storedSlug,
              name: storedChainInfo.name,
              providers: storedChainInfo.providers,
              evmInfo: storedChainInfo.evmInfo,
              substrateInfo: storedChainInfo.substrateInfo,
              isTestnet: storedChainInfo.isTestnet,
              chainStatus: storedChainInfo.chainStatus,
              icon: storedChainInfo.icon
            };
            this.dataMap.chainStateMap[storedSlug] = {
              currentProvider: storedChainInfo.currentProvider,
              slug: storedSlug,
              connectionStatus: _ChainConnectionStatus.DISCONNECTED,
              active: storedChainInfo.active
            };

            newStorageData.push({
              ...mergedChainInfoMap[storedSlug],
              active: storedChainInfo.active,
              currentProvider: storedChainInfo.currentProvider
            });
          }
        }
      }

      // Fill in the missing chainState and storageData (new chains never before seen)
      Object.entries(mergedChainInfoMap).forEach(([slug, chainInfo]) => {
        if (!(slug in this.dataMap.chainStateMap)) {
          this.dataMap.chainStateMap[slug] = {
            currentProvider: Object.keys(chainInfo.providers)[0],
            slug,
            connectionStatus: _ChainConnectionStatus.DISCONNECTED,
            active: _DEFAULT_ACTIVE_CHAINS.includes(slug)
          };

          newStorageData.push({
            ...mergedChainInfoMap[slug],
            active: _DEFAULT_ACTIVE_CHAINS.includes(slug),
            currentProvider: Object.keys(chainInfo.providers)[0]
          });
        }
      });

      this.dataMap.chainInfoMap = mergedChainInfoMap;
    }

    await this.dbService.bulkUpdateChainStore(newStorageData);
    await this.dbService.removeFromChainStore(deprecatedChains); // remove outdated records
    await this.initAssetRegistry(deprecatedChainMap);
  }

  private async initAssetRegistry (deprecatedCustomChainMap: Record<string, string>) {
    const storedAssetRegistry = await this.dbService.getAllAssetStore();
    const latestAssetRegistry = await this.fetchLatestData(_CHAIN_ASSET_SRC, ChainAssetMap) as Record<string, _ChainAsset>;

    // Fill out zk assets from latestAssetRegistry if not supported
    if (!MODULE_SUPPORT.MANTA_ZK) {
      Object.keys(latestAssetRegistry).forEach((slug) => {
        if (_isMantaZkAsset(latestAssetRegistry[slug])) {
          delete latestAssetRegistry[slug];
        }
      });
    }

    if (storedAssetRegistry.length === 0) {
      this.dataMap.assetRegistry = latestAssetRegistry;
    } else {
      const mergedAssetRegistry: Record<string, _ChainAsset> = latestAssetRegistry;

      const parsedStoredAssetRegistry: Record<string, _ChainAsset> = {};
      const deprecatedAssets: string[] = [];

      // Update custom assets of merged custom chains
      Object.values(storedAssetRegistry).forEach((storedAsset) => {
        if (_isCustomAsset(storedAsset.slug) && Object.keys(deprecatedCustomChainMap).includes(storedAsset.originChain)) {
          const newOriginChain = deprecatedCustomChainMap[storedAsset.originChain];
          const newSlug = this.generateSlugForSmartContractAsset(newOriginChain, storedAsset.assetType, storedAsset.symbol, storedAsset.metadata?.contractAddress as string);

          deprecatedAssets.push(storedAsset.slug);
          parsedStoredAssetRegistry[newSlug] = {
            ...storedAsset,
            originChain: newOriginChain,
            slug: newSlug
          };
        } else {
          parsedStoredAssetRegistry[storedAsset.slug] = storedAsset;
        }
      });

      for (const storedAssetInfo of Object.values(parsedStoredAssetRegistry)) {
        let duplicated = false;

        for (const defaultChainAsset of Object.values(latestAssetRegistry)) {
          // case merge custom asset with default asset
          if (_isEqualSmartContractAsset(storedAssetInfo, defaultChainAsset)) {
            duplicated = true;
            break;
          }
        }

        if (!duplicated) {
          mergedAssetRegistry[storedAssetInfo.slug] = storedAssetInfo;
        } else {
          deprecatedAssets.push(storedAssetInfo.slug);
        }
      }

      this.dataMap.assetRegistry = mergedAssetRegistry;

      await this.dbService.removeFromAssetStore(deprecatedAssets);
    }
  }

  private updateChainStateMapSubscription () {
    this.chainStateMapSubject.next(this.getChainStateMap());
  }

  private updateChainInfoMapSubscription () {
    this.chainInfoMapSubject.next(this.getChainInfoMap());
  }

  private updateChainSubscription () {
    this.updateChainInfoMapSubscription();
    this.updateChainStateMapSubscription();
  }

  // Can only update providers or block explorer, crowdloan url
  private async updateChain (params: _NetworkUpsertParams) {
    const chainSlug = params.chainEditInfo.slug;
    const targetChainInfo = this.getChainInfoByKey(chainSlug);
    const targetChainState = this.getChainStateByKey(chainSlug);
    const changedProvider = params.chainEditInfo.currentProvider !== targetChainState.currentProvider;

    if (changedProvider) {
      targetChainInfo.providers = params.chainEditInfo.providers;
      targetChainState.currentProvider = params.chainEditInfo.currentProvider;

      // Enable chain if not before
      if (!targetChainState.active) {
        targetChainState.active = true;
      }

      // It auto detects the change of api url to create new instance or reuse existed one
      await this.initApiForChain(targetChainInfo);
      this.updateChainStateMapSubscription();
    }

    if (targetChainInfo.substrateInfo) {
      if (params.chainEditInfo.blockExplorer !== undefined) {
        targetChainInfo.substrateInfo.blockExplorer = params.chainEditInfo.blockExplorer;
      }

      if (params.chainEditInfo.crowdloanUrl !== undefined) {
        targetChainInfo.substrateInfo.crowdloanUrl = params.chainEditInfo.crowdloanUrl;
      }
    }

    if (targetChainInfo.evmInfo) {
      if (params.chainEditInfo.blockExplorer !== undefined) {
        targetChainInfo.evmInfo.blockExplorer = params.chainEditInfo.blockExplorer;
      }
    }

    this.updateChainInfoMapSubscription();

    this.dbService.updateChainStore({
      ...targetChainInfo,
      active: targetChainState.active,
      currentProvider: targetChainState.currentProvider
    }).then(() => {
      this.eventService.emit('chain.updateState', chainSlug);
    }).catch((e) => this.logger.error(e));
  }

  private async insertChain (params: _NetworkUpsertParams) {
    const chainInfoMap = this.getChainInfoMap();

    if (!params.chainSpec) {
      return;
    }

    const newChainSlug = this.generateSlugForCustomChain(params.chainEditInfo.chainType as string, params.chainEditInfo.name as string, params.chainSpec.paraId, params.chainSpec.evmChainId);

    let substrateInfo: _SubstrateInfo | null = null;
    let evmInfo: _EvmInfo | null = null;

    if (params.chainSpec.genesisHash !== '') {
      substrateInfo = {
        crowdloanFunds: params.chainSpec.crowdloanFunds || null,
        crowdloanParaId: params.chainSpec.crowdloanParaId || null,
        addressPrefix: params.chainSpec.addressPrefix,
        blockExplorer: params.chainEditInfo.blockExplorer || null,
        chainType: params.chainSpec.paraId !== null ? _SubstrateChainType.PARACHAIN : _SubstrateChainType.RELAYCHAIN,
        crowdloanUrl: params.chainEditInfo.crowdloanUrl || null,
        decimals: params.chainSpec.decimals,
        existentialDeposit: params.chainSpec.existentialDeposit,
        paraId: params.chainSpec.paraId,
        symbol: params.chainEditInfo.symbol as string,
        genesisHash: params.chainSpec.genesisHash,
        relaySlug: null,
        hasNativeNft: false,
        supportStaking: params.chainSpec.paraId === null,
        supportSmartContract: null
      };
    } else if (params.chainSpec.evmChainId !== null) {
      evmInfo = {
        supportSmartContract: [_AssetType.ERC20, _AssetType.ERC721], // set support for ERC token by default
        blockExplorer: params.chainEditInfo.blockExplorer || null,
        decimals: params.chainSpec.decimals,
        evmChainId: params.chainSpec.evmChainId,
        existentialDeposit: params.chainSpec.existentialDeposit,
        symbol: params.chainEditInfo.symbol as string,
        abiExplorer: null
      };
    }

    const chainInfo: _ChainInfo = {
      slug: newChainSlug,
      name: params.chainEditInfo.name as string,
      providers: params.chainEditInfo.providers,
      substrateInfo,
      evmInfo,
      isTestnet: false,
      chainStatus: _ChainStatus.ACTIVE,
      icon: '' // Todo: Allow update with custom chain
    };

    // insert new chainInfo
    chainInfoMap[newChainSlug] = chainInfo;

    // insert new chainState
    const chainStateMap = this.getChainStateMap();

    chainStateMap[newChainSlug] = {
      active: true,
      connectionStatus: _ChainConnectionStatus.DISCONNECTED,
      currentProvider: params.chainEditInfo.currentProvider,
      slug: newChainSlug
    };

    await this.initApiForChain(chainInfo);

    // create a record in assetRegistry for native token and update store/subscription
    const nativeTokenSlug = this.upsertCustomToken({
      assetType: _AssetType.NATIVE,
      decimals: params.chainSpec.decimals,
      metadata: null,
      minAmount: params.chainSpec.existentialDeposit,
      multiChainAsset: null,
      name: params.chainEditInfo.name as string,
      originChain: newChainSlug,
      priceId: params.chainEditInfo.priceId || null,
      slug: '',
      symbol: params.chainEditInfo.symbol as string,
      hasValue: true,
      icon: ''
    });

    // update subscription
    this.updateChainSubscription();

    // TODO: add try, catch, move storage update and subject update to somewhere else
    this.dbService.updateChainStore({
      active: true,
      currentProvider: params.chainEditInfo.currentProvider,
      ...chainInfo
    })
      .then(() => {
        this.eventService.emit('chain.add', newChainSlug);
      })
      .catch((e) => this.logger.error(e));

    return nativeTokenSlug;
  }

  public async upsertChain (params: _NetworkUpsertParams) {
    if (this.lockChainInfoMap) {
      return;
    }

    this.lockChainInfoMap = true;

    let result;

    if (params.mode === 'update') { // update existing chainInfo
      await this.updateChain(params);
    } else { // insert custom network
      result = await this.insertChain(params);
    }

    this.lockChainInfoMap = false;

    return result;
  }

  private generateSlugForCustomChain (chainType: string, name: string, paraId: number | null, evmChainId: number | null) {
    const parsedName = name.replaceAll(' ', '').toLowerCase();

    if (evmChainId !== null && evmChainId !== undefined) {
      return `${_CUSTOM_PREFIX}${chainType}-${parsedName}-${evmChainId}`;
    } else {
      let slug = `${_CUSTOM_PREFIX}${chainType}-${parsedName}`;

      if (paraId !== null && paraId !== undefined) {
        slug = slug.concat(`-${paraId}`);
      }

      return slug;
    }
  }

  public async validateCustomChain (provider: string, existingChainSlug?: string): Promise<ValidateNetworkResponse> {
    // currently only supports WS provider for Substrate and HTTP provider for EVM
    let result: ValidateNetworkResponse = {
      decimals: 0,
      existentialDeposit: '',
      paraId: null,
      symbol: '',
      success: false,
      genesisHash: '',
      addressPrefix: '',
      name: '',
      evmChainId: null
    };

    try {
      const { conflictChainName: providerConflictChainName, conflictChainSlug: providerConflictChainSlug, error: providerError } = this.validateProvider(provider, existingChainSlug);

      if (providerError === _CHAIN_VALIDATION_ERROR.NONE) {
        let api: _EvmApi | _SubstrateApi;

        // TODO: EVM chain might have WS provider
        if (provider.startsWith('http')) {
          // HTTP provider is EVM by default
          api = await this.evmChainHandler.initApi('custom', provider);
        } else {
          api = await this.substrateChainHandler.initApi('custom', provider);
        }

        const connectionTimeout = new Promise((resolve) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            resolve(null);
          }, 5000);
        });

        const connectionTrial = await Promise.race([
          connectionTimeout,
          api.isReady
        ]); // check connection

        if (connectionTrial !== null) {
          let _api = connectionTrial as _SubstrateApi | _EvmApi | null;

          const chainSpec = await this.getChainSpecByProvider(_api as _SubstrateApi | _EvmApi);

          result = Object.assign(result, chainSpec);

          // TODO: disconnect and destroy API
          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          // _api?.api?.disconnect && await _api?.api?.disconnect();
          _api = null;

          if (existingChainSlug) {
            // check if same network (with existingChainSlug)
            const existedChainInfo = this.getChainInfoByKey(existingChainSlug);

            if (existedChainInfo.evmInfo !== null) {
              if (result.evmChainId !== existedChainInfo.evmInfo.evmChainId) {
                result.error = _CHAIN_VALIDATION_ERROR.PROVIDER_NOT_SAME_CHAIN;
              }
            } else if (existedChainInfo.substrateInfo !== null) {
              if (result.genesisHash !== existedChainInfo.substrateInfo.genesisHash) {
                result.error = _CHAIN_VALIDATION_ERROR.PROVIDER_NOT_SAME_CHAIN;
              }
            }
          } else {
            // check if network existed
            if (result.evmChainId !== null) {
              for (const chainInfo of Object.values(this.getEvmChainInfoMap())) {
                if (chainInfo?.evmInfo?.evmChainId === result.evmChainId) {
                  result.error = _CHAIN_VALIDATION_ERROR.EXISTED_CHAIN;
                  result.conflictChain = chainInfo.name;
                  result.conflictKey = chainInfo.slug;

                  break;
                }
              }
            } else if (result.genesisHash !== '') {
              for (const chainInfo of Object.values(this.getSubstrateChainInfoMap())) {
                if (chainInfo?.substrateInfo?.genesisHash === result.genesisHash) {
                  result.error = _CHAIN_VALIDATION_ERROR.EXISTED_CHAIN;
                  result.conflictChain = chainInfo.name;
                  result.conflictKey = chainInfo.slug;

                  break;
                }
              }
            }
          }
        } else {
          result.error = _CHAIN_VALIDATION_ERROR.CONNECTION_FAILURE;
          result.success = false;
        }
      } else {
        result.success = false;
        result.error = providerError;
        result.conflictChain = providerConflictChainName;
        result.conflictKey = providerConflictChainSlug;
      }

      if (!result.error && (result.evmChainId !== null || result.genesisHash !== '')) {
        result.success = true;
      }

      return result;
    } catch (e) {
      console.error('Error connecting to provider', e);

      result.success = false;
      result.error = _CHAIN_VALIDATION_ERROR.CONNECTION_FAILURE;

      return result;
    }
  }

  private async getChainSpecByProvider (api: _EvmApi | _SubstrateApi) {
    if (api.api instanceof Web3) {
      return await this.evmChainHandler.getChainSpec(api as _EvmApi);
    }

    return await this.substrateChainHandler.getChainSpec(api as _SubstrateApi);
  }

  private validateProvider (targetProvider: string, existingChainSlug?: string) {
    let error: _CHAIN_VALIDATION_ERROR = _CHAIN_VALIDATION_ERROR.NONE;
    const chainInfoMap = this.getChainInfoMap();
    const allExistedProviders: Record<string, string | boolean>[] = [];
    let conflictChainSlug = '';
    let conflictChainName = '';

    if (existingChainSlug) {
      const chainInfo = chainInfoMap[existingChainSlug];

      if (Object.values(chainInfo.providers).includes(targetProvider)) {
        error = _CHAIN_VALIDATION_ERROR.EXISTED_PROVIDER;
        conflictChainSlug = chainInfo.slug;
        conflictChainName = chainInfo.name;
      }

      return { error, conflictChainSlug, conflictChainName };
    }

    // get all providers
    for (const [key, value] of Object.entries(chainInfoMap)) {
      Object.values(value.providers).forEach((provider) => {
        allExistedProviders.push({ key, provider });
      });
    }

    for (const { key, provider } of allExistedProviders) {
      if (provider === targetProvider) {
        error = _CHAIN_VALIDATION_ERROR.EXISTED_PROVIDER;
        conflictChainSlug = key as string;
        conflictChainName = chainInfoMap[key as string].name;
        break;
      }
    }

    return { error, conflictChainSlug, conflictChainName };
  }

  private async getSmartContractTokenInfo (contractAddress: string, tokenType: _AssetType, originChain: string, contractCaller?: string): Promise<_SmartContractTokenInfo> {
    if ([_AssetType.ERC721, _AssetType.ERC20].includes(tokenType)) {
      return await this.evmChainHandler.getSmartContractTokenInfo(contractAddress, tokenType, originChain);
    } else if ([_AssetType.PSP34, _AssetType.PSP22].includes(tokenType)) {
      return await this.substrateChainHandler.getSmartContractTokenInfo(contractAddress, tokenType, originChain, contractCaller);
    }

    return {
      decimals: -1,
      name: '',
      symbol: '',
      contractError: false
    };
  }

  public async validateCustomToken (data: _ValidateCustomAssetRequest): Promise<_ValidateCustomAssetResponse> {
    const assetRegistry = this.getSmartContractTokens();
    let existedToken: _ChainAsset | undefined;

    for (const token of Object.values(assetRegistry)) {
      const contractAddress = token?.metadata?.contractAddress as string;

      if (_isEqualContractAddress(contractAddress, data.contractAddress) && token.assetType === data.type && token.originChain === data.originChain) {
        existedToken = token;
        break;
      }
    }

    if (existedToken) {
      return {
        decimals: existedToken.decimals || 0,
        name: existedToken.name,
        symbol: existedToken.symbol,
        isExist: !!existedToken,
        existedSlug: existedToken?.slug,
        contractError: false
      };
    }

    const { contractError, decimals, name, symbol } = await this.getSmartContractTokenInfo(data.contractAddress, data.type, data.originChain, data.contractCaller);

    return {
      name,
      decimals,
      symbol,
      isExist: !!existedToken,
      contractError
    };
  }

  private generateSlugForSmartContractAsset (originChain: string, assetType: _AssetType, symbol: string, contractAddress: string) {
    return `${originChain}-${assetType}-${symbol}-${contractAddress}`;
  }

  private generateSlugForNativeToken (originChain: string, assetType: _AssetType, symbol: string) {
    return `${originChain}-${assetType}-${symbol}`;
  }

  public refreshSubstrateApi (slug: string) {
    this.substrateChainHandler.recoverApi(slug).catch(console.error);
  }

  public refreshEvmApi (slug: string) {
    this.evmChainHandler.recoverApi(slug).catch(console.error);
  }

  public async stopAllChainApis () {
    await Promise.all([
      this.substrateChainHandler.sleep(),
      this.evmChainHandler.sleep()
    ]);
  }

  public async resumeAllChainApis () {
    await Promise.all([
      this.substrateChainHandler.wakeUp(),
      this.evmChainHandler.wakeUp()
    ]);
  }

  public checkAndUpdateStatusMapForChain (chainSlug: string) {
    const substrateApiMap = this.getSubstrateApiMap();
    const evmApiMap = this.getEvmApiMap();
    const chainState = this.getChainStateByKey(chainSlug);
    let update = false;

    function updateState (current: _ChainState, status: _ChainConnectionStatus) {
      if (current.connectionStatus !== status) {
        current.connectionStatus = status;
        update = true;
      }
    }

    if (chainState.active) {
      const api = substrateApiMap[chainSlug] || evmApiMap[chainSlug];

      if (api) {
        updateState(chainState, api.isApiConnected ? _ChainConnectionStatus.CONNECTED : _ChainConnectionStatus.DISCONNECTED);
      }
    } else {
      updateState(chainState, _ChainConnectionStatus.DISCONNECTED);
    }

    if (update) {
      this.dataMap.chainStateMap[chainSlug] = chainState;
    }
  }

  public async initAssetSettings () {
    const assetSettings = await this.getAssetSettings();
    const activeChainSlugs = this.getActiveChainSlugs();
    const assetRegistry = this.getAssetRegistry();

    if (Object.keys(assetSettings).length === 0) { // only initiate the first time
      Object.values(assetRegistry).forEach((assetInfo) => {
        const isSettingExisted = assetInfo.slug in assetSettings;

        // Set visible for every enabled chains
        if (activeChainSlugs.includes(assetInfo.originChain) && !isSettingExisted) {
          // Setting only exist when set either by chain settings or user
          assetSettings[assetInfo.slug] = {
            visible: true
          };
        }
      });

      this.setAssetSettings(assetSettings, false);
    }

    this.eventService.emit('asset.ready', true);
  }

  public setAssetSettings (assetSettings: Record<string, AssetSetting>, emitEvent = true): void {
    const updateAssets: string[] = [];

    if (emitEvent) {
      Object.keys(assetSettings).forEach((slug) => {
        if (this.assetSettingSubject.value[slug]?.visible !== assetSettings[slug].visible) {
          updateAssets.push(slug);
        }
      });
    }

    this.assetSettingSubject.next(assetSettings);

    updateAssets.forEach((slug) => {
      this.eventService.emit('asset.updateState', slug);
    });

    this.store.set('AssetSetting', assetSettings);
  }

  public setMantaZkAssetSettings (visible: boolean) {
    const zkAssetSettings: Record<string, AssetSetting> = {};

    Object.values(this.dataMap.assetRegistry).forEach((asset) => {
      if (_isMantaZkAsset(asset)) {
        zkAssetSettings[asset.slug] = {
          visible
        };
      }
    });

    this.store.get('AssetSetting', (storedAssetSettings) => {
      const newAssetSettings = {
        ...storedAssetSettings,
        ...zkAssetSettings
      };

      this.store.set('AssetSetting', newAssetSettings);

      this.assetSettingSubject.next(newAssetSettings);

      Object.keys(zkAssetSettings).forEach((slug) => {
        this.eventService.emit('asset.updateState', slug);
      });
    });
  }

  public async getStoreAssetSettings (): Promise<Record<string, AssetSetting>> {
    return new Promise((resolve) => {
      this.store.get('AssetSetting', resolve);
    });
  }

  public async getAssetSettings (): Promise<Record<string, AssetSetting>> {
    if (Object.keys(this.assetSettingSubject.value).length === 0) {
      const assetSettings = (await this.getStoreAssetSettings() || {});

      this.assetSettingSubject.next(assetSettings);
    }

    return this.assetSettingSubject.value;
  }

  public async updateAssetSetting (assetSlug: string, assetSetting: AssetSetting, autoEnableNativeToken?: boolean): Promise<boolean | undefined> {
    const currentAssetSettings = await this.getAssetSettings();

    let needUpdateSubject: boolean | undefined;

    // Update settings
    currentAssetSettings[assetSlug] = assetSetting;

    if (assetSetting.visible) {
      const assetInfo = this.getAssetBySlug(assetSlug);
      const chainState = this.getChainStateByKey(assetInfo.originChain);

      // if chain not enabled, then automatically enable
      if (chainState && !chainState.active) {
        await this.enableChain(chainState.slug);
        needUpdateSubject = true;

        if (autoEnableNativeToken) {
          const nativeAsset = this.getNativeTokenInfo(assetInfo.originChain);

          currentAssetSettings[nativeAsset.slug] = { visible: true };
        }
      }
    }

    this.setAssetSettings(currentAssetSettings);

    return needUpdateSubject;
  }

  public async updateAssetSettingByChain (chainSlug: string, visible: boolean) {
    const storedAssetSettings = await this.getAssetSettings();
    const assetsByChain = this.getFungibleTokensByChain(chainSlug);
    const assetSettings: Record<string, AssetSetting> = storedAssetSettings || {};

    Object.values(assetsByChain).forEach((assetInfo) => {
      assetSettings[assetInfo.slug] = { visible };
    });

    this.setAssetSettings(assetSettings);
  }

  public subscribeAssetSettings () {
    return this.assetSettingSubject;
  }

  public async getChainLogoMap (): Promise<Record<string, string>> {
    return await this.fetchLatestData(_CHAIN_LOGO_MAP_SRC, ChainLogoMap) as Record<string, string>;
  }

  public async getAssetLogoMap (): Promise<Record<string, string>> {
    return await this.fetchLatestData(_ASSET_LOGO_MAP_SRC, AssetLogoMap) as Record<string, string>;
  }

  public resetWallet (resetAll: boolean) {
    if (resetAll) {
      this.setAssetSettings({});

      // Disconnect chain
      const activeChains = this.getActiveChainInfos();

      for (const chain of Object.keys(activeChains)) {
        if (!_DEFAULT_ACTIVE_CHAINS.includes(chain)) {
          this.disableChain(chain);
        }
      }

      // Remove custom chain
      const allChains = this.getChainInfoMap();

      for (const chain of Object.keys(allChains)) {
        if (_isCustomChain(chain)) {
          this.removeCustomChain(chain);
        }
      }

      // Remove custom asset
      const assetSettings = this.getAssetSettings();

      const customToken: string[] = [];

      for (const asset of Object.keys(assetSettings)) {
        if (_isCustomAsset(asset)) {
          customToken.push(asset);
        }
      }

      this.deleteCustomAssets(customToken);
    }
  }

  getMetadata (chain: string) {
    return this.dbService.stores.metadata.getMetadata(chain);
  }

  upsertMetadata (chain: string, metadata: IMetadataItem) {
    return this.dbService.stores.metadata.upsertMetadata(chain, metadata);
  }

  getMetadataByHash (hash: string) {
    return this.dbService.stores.metadata.getMetadataByGenesisHash(hash);
  }
}
