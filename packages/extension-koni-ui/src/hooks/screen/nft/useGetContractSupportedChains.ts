// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@soul-wallet/chain-list/types';
import { _isChainSupportEvmNft, _isChainSupportWasmNft } from '@soul-wallet/extension-base/services/chain-service/utils';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

function filterContractTypes (chainInfoMap: Record<string, _ChainInfo>) {
  const filteredChainInfoMap: Record<string, _ChainInfo> = {};

  Object.values(chainInfoMap).forEach((chainInfo) => {
    if (_isChainSupportEvmNft(chainInfo) || _isChainSupportWasmNft(chainInfo)) {
      filteredChainInfoMap[chainInfo.slug] = chainInfo;
    }
  });

  return filteredChainInfoMap;
}

export default function useGetContractSupportedChains (): Record<string, _ChainInfo> {
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);

  return useMemo(() => {
    return filterContractTypes(chainInfoMap);
  }, [chainInfoMap]);
}
