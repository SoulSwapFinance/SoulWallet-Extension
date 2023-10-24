// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RootState } from '@soul-wallet/extension-koni-ui/stores';
import { findChainInfoByChainId } from '@soul-wallet/extension-koni-ui/utils/chain/chain';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const useGetChainInfoByChainId = (chainId?: number) => {
  const { chainInfoMap } = useSelector((state: RootState) => state.chainStore);

  return useMemo(() => findChainInfoByChainId(chainInfoMap, chainId), [chainInfoMap, chainId]);
};

export default useGetChainInfoByChainId;
