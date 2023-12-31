// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _getChainNativeTokenSlug } from '@soul-wallet/extension-base/services/chain-service/utils';
import { ALL_KEY } from '@soul-wallet/extension-koni-ui/constants/common';
import { RootState } from '@soul-wallet/extension-koni-ui/stores';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const useGetNativeTokenSlug = (chainSlug: string): string => {
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);

  return useMemo(() => {
    if (chainSlug && chainSlug !== ALL_KEY) {
      const chainInfo = chainInfoMap[chainSlug];

      return _getChainNativeTokenSlug(chainInfo);
    }

    return '';
  }, [chainInfoMap, chainSlug]);
};

export default useGetNativeTokenSlug;
