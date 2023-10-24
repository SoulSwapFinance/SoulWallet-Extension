// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { StakingType } from '@soul-wallet/extension-base/background/KoniTypes';
import { BaseAccountInfo } from '@soul-wallet/extension-koni-ui/components/Account/Info/AvatarGroup';
import { RootState } from '@soul-wallet/extension-koni-ui/stores';
import { findAccountByAddress } from '@soul-wallet/extension-koni-ui/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export default function useGetAccountsByStaking (chain: string, stakingType: StakingType): BaseAccountInfo[] {
  const stakingItems = useSelector((state: RootState) => state.staking.stakingMap);
  const accounts = useSelector((state: RootState) => state.accountState.accounts);

  return useMemo(() => {
    const accountInfos: BaseAccountInfo[] = [];

    stakingItems.forEach((stakingItem) => {
      if (stakingItem.chain === chain && stakingItem.type === stakingType) {
        accountInfos.push({ address: stakingItem.address });
      }
    });

    accountInfos.forEach((accountInfo) => {
      const accountJson = findAccountByAddress(accounts, accountInfo.address);

      if (accountJson) {
        accountInfo.name = accountJson.name;
        accountInfo.type = accountJson.type;
      }
    });

    return accountInfos;
  }, [accounts, chain, stakingItems, stakingType]);
}
