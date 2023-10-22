// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Chain } from '@soul-wallet/extension-chains/types';

import { getMetadata, getMetadataRaw } from '@subwallet/extension-koni-ui/messaging';
import { useEffect, useState } from 'react';

import { useSelector } from '../../common';

export default function useMetadata (genesisHash?: string | null, isPartial?: boolean): Chain | null {
  const [chain, setChain] = useState<Chain | null>(null);
  const { chainInfoMap } = useSelector((state) => state.chainStore);

  useEffect((): void => {
    if (genesisHash) {
      const getChainByMetaStore = () => {
        getMetadata(genesisHash, isPartial)
          .then(setChain)
          .catch((error): void => {
            console.error(error);
            setChain(null);
          });
      };

      getMetadataRaw(chainInfoMap, genesisHash).then((chain) => {
        if (chain) {
          setChain(chain);
        } else {
          getChainByMetaStore();
        }
      }).catch((e) => {
        console.error(e);
        getChainByMetaStore();
      });
    } else {
      setChain(null);
    }
  }, [chainInfoMap, genesisHash, isPartial]);

  return chain;
}
