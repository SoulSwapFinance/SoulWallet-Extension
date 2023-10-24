// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@soul-wallet/chain-list/types';
import { StakingType } from '@soul-wallet/extension-base/background/KoniTypes';
import { AccountJson } from '@soul-wallet/extension-base/background/types';
import { _getSubstrateGenesisHash, _isChainEvmCompatible } from '@soul-wallet/extension-base/services/chain-service/utils';
import { ALL_KEY } from '@soul-wallet/extension-koni-ui/constants/common';
import { isAccountAll } from '@soul-wallet/extension-koni-ui/utils';

import { isEthereumAddress } from '@polkadot/util-crypto';

const defaultAccountFilter = (stakingType: StakingType, chain?: _ChainInfo): ((account: AccountJson) => boolean) => {
  return (account: AccountJson) => {
    const isEvmAddress = isEthereumAddress(account.address);
    const availableGen: string[] = account.availableGenesisHashes || [];

    if (account.isHardware) {
      if (isEvmAddress) {
        return false;
      } else {
        if (chain && !availableGen.includes(_getSubstrateGenesisHash(chain))) {
          return false;
        }
      }
    }

    if (isAccountAll(account.address)) {
      return false;
    }

    if (account.isReadOnly) {
      return false;
    }

    return !(stakingType === StakingType.POOLED && isEthereumAddress(account.address));
  };
};

export const accountFilterFunc = (chainInfoMap: Record<string, _ChainInfo>, stakingType: StakingType, stakingChain?: string): ((account: AccountJson) => boolean) => {
  return (account: AccountJson) => {
    if (stakingChain && stakingChain !== ALL_KEY) {
      const chain = chainInfoMap[stakingChain];
      const defaultFilter = defaultAccountFilter(stakingType, chain);
      const isEvmChain = _isChainEvmCompatible(chain);
      const isEvmAddress = isEthereumAddress(account.address);

      return defaultFilter(account) && isEvmChain === isEvmAddress;
    } else {
      return defaultAccountFilter(stakingType)(account);
    }
  };
};
