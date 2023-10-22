// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo, _ChainStatus } from '@soul-wallet/chain-list/types';
import { _ChainState } from '@soul-wallet/extension-base/services/chain-service/types';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export type ChainInfoWithState = _ChainInfo & _ChainState;

export default function useChainInfoWithState ({ filterStatus = true } = {} as {filterStatus?: boolean}): ChainInfoWithState[] {
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);
  const chainStateMap = useSelector((state: RootState) => state.chainStore.chainStateMap);

  const chainInfoList: ChainInfoWithState[] = useMemo(() => {
    const rs = Object.values(chainInfoMap).map((item) => {
      return { ...item, ...(chainStateMap[item.slug] || {}) };
    });

    if (filterStatus) {
      return rs.filter((item) => item.chainStatus === _ChainStatus.ACTIVE);
    } else {
      return rs;
    }
  }, [chainInfoMap, chainStateMap, filterStatus]);

  return chainInfoList;
}
