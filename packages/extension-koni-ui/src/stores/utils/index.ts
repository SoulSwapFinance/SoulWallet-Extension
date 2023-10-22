// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _AssetRef, _ChainAsset, _ChainInfo, _MultiChainAsset } from '@soul-wallet/chain-list/types';
import { AuthUrls } from '@subwallet/extension-base/background/handlers/State';
import { AccountsWithCurrentAddress, AddressBookInfo, AllLogoMap, AssetSetting, BalanceJson, ChainStakingMetadata, ConfirmationsQueue, CrowdloanJson, KeyringState, MantaPayConfig, MantaPaySyncState, NftCollection, NftJson, NominatorMetadata, PriceJson, StakingJson, StakingRewardJson, TransactionHistoryItem, UiSettings } from '@subwallet/extension-base/background/KoniTypes';
import { AccountJson, AccountsContext, AuthorizeRequest, ConfirmationRequestBase, MetadataRequest, SigningRequest } from '@subwallet/extension-base/background/types';
import { _ChainState } from '@subwallet/extension-base/services/chain-service/types';
import { SWTransactionResult } from '@subwallet/extension-base/services/transaction-service/types';
import { WalletConnectNotSupportRequest, WalletConnectSessionRequest } from '@subwallet/extension-base/services/wallet-connect-service/types';
import { canDerive } from '@subwallet/extension-base/utils';
import { lazySendMessage, lazySubscribeMessage } from '@subwallet/extension-koni-ui/messaging';
import { store } from '@subwallet/extension-koni-ui/stores';
import { buildHierarchy } from '@subwallet/extension-koni-ui/utils/account/buildHierarchy';
import { SessionTypes } from '@walletconnect/types';

// Setup redux stores

// Base
// AccountState store
export const updateAccountData = (data: AccountsWithCurrentAddress) => {
  let currentAccountJson: AccountJson = data.accounts[0];
  const accounts = data.accounts;

  accounts.forEach((accountJson) => {
    if (accountJson.address === data.currentAddress) {
      currentAccountJson = accountJson;
    }
  });

  const hierarchy = buildHierarchy(accounts);
  const master = hierarchy.find(({ isExternal, type }) => !isExternal && canDerive(type));

  updateCurrentAccountState(currentAccountJson);
  updateAccountsContext({
    accounts,
    hierarchy,
    master
  } as AccountsContext);
};

export const updateCurrentAccountState = (currentAccountJson: AccountJson) => {
  store.dispatch({ type: 'accountState/updateCurrentAccount', payload: currentAccountJson });
};

export const updateAccountsContext = (data: AccountsContext) => {
  store.dispatch({ type: 'accountState/updateAccountsContext', payload: data });
};

export const subscribeAccountsData = lazySubscribeMessage('pri(accounts.subscribeWithCurrentAddress)', {}, updateAccountData, updateAccountData);

export const updateKeyringState = (data: KeyringState) => {
  store.dispatch({ type: 'accountState/updateKeyringState', payload: data });
};

export const subscribeKeyringState = lazySubscribeMessage('pri(keyring.subscribe)', null, updateKeyringState, updateKeyringState);

export const updateAddressBook = (data: AddressBookInfo) => {
  store.dispatch({ type: 'accountState/updateAddressBook', payload: data });
};

export const subscribeAddressBook = lazySubscribeMessage('pri(accounts.subscribeAddresses)', null, updateAddressBook, updateAddressBook);

function convertConfirmationToMap (data: ConfirmationRequestBase[]) {
  return data.reduce((prev, request) => {
    prev[request.id] = request;

    return prev;
  }, {} as Record<string, ConfirmationRequestBase>);
}

export const updateAuthorizeRequests = (data: AuthorizeRequest[]) => {
  // Convert data to object with key as id
  const requests = convertConfirmationToMap(data);

  store.dispatch({ type: 'requestState/updateAuthorizeRequests', payload: requests });
};

export const subscribeAuthorizeRequests = lazySubscribeMessage('pri(authorize.requestsV2)', null, updateAuthorizeRequests, updateAuthorizeRequests);

export const updateMetadataRequests = (data: MetadataRequest[]) => {
  // Convert data to object with key as id
  const requests = convertConfirmationToMap(data);

  store.dispatch({ type: 'requestState/updateMetadataRequests', payload: requests });
};

export const subscribeMetadataRequests = lazySubscribeMessage('pri(metadata.requests)', null, updateMetadataRequests, updateMetadataRequests);

export const updateSigningRequests = (data: SigningRequest[]) => {
  // Convert data to object with key as id
  const requests = convertConfirmationToMap(data);

  store.dispatch({ type: 'requestState/updateSigningRequests', payload: requests });
};

export const subscribeSigningRequests = lazySubscribeMessage('pri(signing.requests)', null, updateSigningRequests, updateSigningRequests);

export const updateConfirmationRequests = (data: ConfirmationsQueue) => {
  store.dispatch({ type: 'requestState/updateConfirmationRequests', payload: data });
};

export const subscribeConfirmationRequests = lazySubscribeMessage('pri(confirmations.subscribe)', null, updateConfirmationRequests, updateConfirmationRequests);

export const updateTransactionRequests = (data: Record<string, SWTransactionResult>) => {
  // Convert data to object with key as id

  store.dispatch({ type: 'requestState/updateTransactionRequests', payload: data });
};

export const subscribeTransactionRequests = lazySubscribeMessage('pri(transactions.subscribe)', null, updateTransactionRequests, updateTransactionRequests);

// Settings Store

export const updateUiSettings = (data: UiSettings) => {
  store.dispatch({ type: 'settings/updateUiSettings', payload: data });
};

export const subscribeUiSettings = lazySubscribeMessage('pri(settings.subscribe)', null, updateUiSettings, updateUiSettings);

export const updateLogoMaps = (data: AllLogoMap) => {
  store.dispatch({ type: 'settings/updateLogoMaps', payload: data });
};

export const getLogoMaps = lazySendMessage('pri(settings.getLogoMaps)', null, updateLogoMaps);

//
// export const updateAppSettings = (data: AccountJson) => {
//   store.dispatch({ type: 'accountState/updateCurrentAccount', payload: data });
// };
//
// export const subscribeAppSettings = lazySubscribeMessage('pri(accounts.subscribeWithCurrentAddress)', {}, updateCurrentAccountState, updateCurrentAccountState);
//
export const updateAuthUrls = (data: AuthUrls) => {
  store.dispatch({ type: 'settings/updateAuthUrls', payload: data });
};

export const subscribeAuthUrls = lazySubscribeMessage('pri(authorize.subscribe)', null, updateAuthUrls, updateAuthUrls);

// export const updateMediaAllowance = (data: AccountJson) => {
//   store.dispatch({ type: 'accountState/updateCurrentAccount', payload: data });
// };
//
// export const subscribeMediaAllowance = lazySubscribeMessage('pri(accounts.subscribeWithCurrentAddress)', {}, updateCurrentAccountState, updateCurrentAccountState);

export const updateChainInfoMap = (data: Record<string, _ChainInfo>) => {
  store.dispatch({ type: 'chainStore/updateChainInfoMap', payload: data });
};

export const subscribeChainInfoMap = lazySubscribeMessage('pri(chainService.subscribeChainInfoMap)', null, updateChainInfoMap, updateChainInfoMap);

export const updateChainStateMap = (data: Record<string, _ChainState>) => {
  // TODO useTokenGroup
  store.dispatch({ type: 'chainStore/updateChainStateMap', payload: data });
};

export const subscribeChainStateMap = lazySubscribeMessage('pri(chainService.subscribeChainStateMap)', null, updateChainStateMap, updateChainStateMap);

export const updateAssetRegistry = (data: Record<string, _ChainAsset>) => {
  // TODO useTokenGroup
  store.dispatch({ type: 'assetRegistry/updateAssetRegistry', payload: data });
};

export const subscribeAssetRegistry = lazySubscribeMessage('pri(chainService.subscribeAssetRegistry)', null, updateAssetRegistry, updateAssetRegistry);

export const updateMultiChainAssetRegistry = (data: Record<string, _MultiChainAsset>) => {
  store.dispatch({ type: 'assetRegistry/updateMultiChainAssetMap', payload: data });
};

export const subscribeMultiChainAssetMap = lazySubscribeMessage('pri(chainService.subscribeMultiChainAssetMap)', null, updateMultiChainAssetRegistry, updateMultiChainAssetRegistry);

export const updateXcmRefMap = (data: Record<string, _AssetRef>) => {
  store.dispatch({ type: 'assetRegistry/updateXcmRefMap', payload: data });
};

export const subscribeXcmRefMap = lazySubscribeMessage('pri(chainService.subscribeXcmRefMap)', null, updateXcmRefMap, updateXcmRefMap);

export const updateAssetSettingMap = (data: Record<string, AssetSetting>) => {
  store.dispatch({ type: 'assetRegistry/updateAssetSettingMap', payload: data });
};

export const subscribeAssetSettings = lazySubscribeMessage('pri(assetSetting.getSubscription)', null, updateAssetSettingMap, updateAssetSettingMap);

// Features
export const updatePrice = (data: PriceJson) => {
  store.dispatch({ type: 'price/updatePrice', payload: data });
};

export const subscribePrice = lazySubscribeMessage('pri(price.getSubscription)', null, updatePrice, updatePrice);

export const updateBalance = (data: BalanceJson) => {
  store.dispatch({ type: 'balance/update', payload: data.details });
};

export const subscribeBalance = lazySubscribeMessage('pri(balance.getSubscription)', null, updateBalance, updateBalance);

export const updateCrowdloan = (data: CrowdloanJson) => {
  store.dispatch({ type: 'crowdloan/update', payload: data.details });
};

export const subscribeCrowdloan = lazySubscribeMessage('pri(crowdloan.getSubscription)', null, updateCrowdloan, updateCrowdloan);

export const updateNftItems = (data: NftJson) => {
  store.dispatch({ type: 'nft/updateNftItems', payload: data.nftList });
};

export const subscribeNftItems = lazySubscribeMessage('pri(nft.getSubscription)', null, updateNftItems, updateNftItems);

export const updateNftCollections = (data: NftCollection[]) => {
  store.dispatch({ type: 'nft/updateNftCollections', payload: data });
};

export const subscribeNftCollections = lazySubscribeMessage('pri(nftCollection.getSubscription)', null, updateNftCollections, updateNftCollections);

export const updateStaking = (data: StakingJson) => {
  store.dispatch({ type: 'staking/updateStaking', payload: data.details });
};

export const subscribeStaking = lazySubscribeMessage('pri(staking.getSubscription)', null, updateStaking, updateStaking);

export const updateStakingReward = (stakingRewardJson: StakingRewardJson) => {
  store.dispatch({ type: 'staking/updateStakingReward', payload: Object.values(stakingRewardJson.data) });
};

export const subscribeStakingReward = lazySubscribeMessage('pri(stakingReward.getSubscription)', null, updateStakingReward, updateStakingReward);

export const updateChainStakingMetadata = (data: ChainStakingMetadata[]) => {
  store.dispatch({ type: 'staking/updateChainStakingMetadata', payload: data });
};

export const subscribeChainStakingMetadata = lazySubscribeMessage('pri(bonding.subscribeChainStakingMetadata)', null, updateChainStakingMetadata, updateChainStakingMetadata);

export const updateStakingNominatorMetadata = (data: NominatorMetadata[]) => {
  store.dispatch({ type: 'staking/updateNominatorMetadata', payload: data });
};

export const subscribeStakingNominatorMetadata = lazySubscribeMessage('pri(bonding.subscribeNominatorMetadata)', null, updateStakingNominatorMetadata, updateStakingNominatorMetadata);

export const updateTxHistory = (data: TransactionHistoryItem[]) => {
  store.dispatch({ type: 'transactionHistory/update', payload: data });
};

export const subscribeTxHistory = lazySubscribeMessage('pri(transaction.history.getSubscription)', null, updateTxHistory, updateTxHistory);

export const updateMantaPayConfig = (data: MantaPayConfig[]) => {
  store.dispatch({ type: 'mantaPay/updateConfig', payload: data });
};

export const subscribeMantaPayConfig = lazySubscribeMessage('pri(mantaPay.subscribeConfig)', null, updateMantaPayConfig, updateMantaPayConfig);

export const updateMantaPaySyncing = (data: MantaPaySyncState) => {
  store.dispatch({ type: 'mantaPay/updateIsSyncing', payload: data });
};

export const subscribeMantaPaySyncingState = lazySubscribeMessage('pri(mantaPay.subscribeSyncingState)', null, updateMantaPaySyncing, updateMantaPaySyncing);

// export const updateChainValidators = (data: ChainValidatorParams) => {
//   store.dispatch({ type: 'bonding/updateChainValidators', payload: data });
// };
//
// export const subscribeChainValidators = lazySubscribeMessage('pri(bonding.getBondingOptions)', null, updateChainValidators, updateChainValidators);

/* Wallet connect */

export const updateConnectWCRequests = (data: WalletConnectSessionRequest[]) => {
  // Convert data to object with key as id
  const requests = convertConfirmationToMap(data);

  store.dispatch({ type: 'requestState/updateConnectWCRequests', payload: requests });
};

export const subscribeConnectWCRequests = lazySubscribeMessage('pri(walletConnect.requests.connect.subscribe)', null, updateConnectWCRequests, updateConnectWCRequests);

export const updateWalletConnectSessions = (data: SessionTypes.Struct[]) => {
  const payload: Record<string, SessionTypes.Struct> = {};

  data.forEach((session) => {
    payload[session.topic] = session;
  });
  store.dispatch({ type: 'walletConnect/updateSessions', payload: payload });
};

export const subscribeWalletConnectSessions = lazySubscribeMessage('pri(walletConnect.session.subscribe)', null, updateWalletConnectSessions, updateWalletConnectSessions);

export const updateWCNotSupportRequests = (data: WalletConnectNotSupportRequest[]) => {
  // Convert data to object with key as id
  const requests = convertConfirmationToMap(data);

  store.dispatch({ type: 'requestState/updateWCNotSupportRequests', payload: requests });
};

export const subscribeWCNotSupportRequests = lazySubscribeMessage('pri(walletConnect.requests.notSupport.subscribe)', null, updateWCNotSupportRequests, updateWCNotSupportRequests);
