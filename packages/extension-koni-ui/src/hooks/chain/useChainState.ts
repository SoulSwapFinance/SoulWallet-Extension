// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainState } from '@soul-wallet/extension-base/services/chain-service/types';
import { RootState } from '@soul-wallet/extension-koni-ui/stores';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export default function useChainState (slug: string): _ChainState {
  const chainStateMap = useSelector((state: RootState) => state.chainStore.chainStateMap);

  return useMemo(() => {
    return chainStateMap[slug];
  }, [chainStateMap, slug]);
}
