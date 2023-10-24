// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ChainStakingMetadata, NominatorMetadata, StakingItem, StakingRewardItem } from '@soul-wallet/extension-base/background/KoniTypes';

export type StakingDataType = {
  staking: StakingItem;
  chainStakingMetadata?: ChainStakingMetadata;
  nominatorMetadata?: NominatorMetadata;
  reward?: StakingRewardItem;
  decimals: number;
};

export type StakingData = {
  data: StakingDataType[];
  priceMap: Record<string, number>;
};
