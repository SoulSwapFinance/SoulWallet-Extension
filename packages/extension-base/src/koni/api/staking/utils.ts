// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@soul-wallet/chain-list/types';
import { _getChainNativeTokenBasicInfo } from '@soul-wallet/extension-base/services/chain-service/utils';
import { toUnit } from '@soul-wallet/extension-base/utils';

export function parseStakingBalance (balance: number, chain: string, network: Record<string, _ChainInfo>): number {
  const { decimals } = _getChainNativeTokenBasicInfo(network[chain]);

  return toUnit(balance, decimals);
}
