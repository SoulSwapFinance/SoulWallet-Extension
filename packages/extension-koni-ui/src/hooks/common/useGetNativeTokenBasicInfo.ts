// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BasicTokenInfo } from '@soul-wallet/extension-base/background/KoniTypes';
import { _getChainNativeTokenBasicInfo } from '@soul-wallet/extension-base/services/chain-service/utils';
import { RootState } from '@soul-wallet/extension-koni-ui/stores';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export default function useGetNativeTokenBasicInfo (chainSlug: string): BasicTokenInfo {
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);

  return useMemo(() => {
    const chainInfo = chainInfoMap[chainSlug];

    return _getChainNativeTokenBasicInfo(chainInfo);
  }, [chainInfoMap, chainSlug]);
}
