// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@soul-wallet/chain-list/types';
import { LedgerNetwork } from '@soul-wallet/extension-base/background/KoniTypes';
import { _ChainState } from '@soul-wallet/extension-base/services/chain-service/types';
import { _isChainEvmCompatible } from '@soul-wallet/extension-base/services/chain-service/utils';
import { PredefinedLedgerNetwork } from '@soul-wallet/extension-koni-ui/constants/ledger';

interface ChainItem extends _ChainState {
  isEthereum: boolean;
}

export const getSupportedLedger = (networkInfoMap: Record<string, _ChainInfo>, networkStateMap: Record<string, _ChainState>): LedgerNetwork[] => {
  const supportedLedgerNetwork = [...PredefinedLedgerNetwork];
  const networkInfoItems: ChainItem[] = [];

  Object.values(networkStateMap).forEach((chainState) => {
    if (chainState.active) {
      networkInfoItems.push({ ...chainState, isEthereum: _isChainEvmCompatible(networkInfoMap[chainState.slug]) });
    }
  });

  return supportedLedgerNetwork.filter((ledgerNetwork) => {
    return networkInfoItems.find((item) => ledgerNetwork.slug === item.slug || (ledgerNetwork.isEthereum && item.isEthereum));
  });
};
