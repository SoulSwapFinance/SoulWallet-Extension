// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AmountData } from '@soul-wallet/extension-base/background/KoniTypes';
import { balanceFormatter, formatNumber } from '@subwallet/react-ui';
import BigN from 'bignumber.js';

export const formatBalance = (value: string | number | BigN, decimals: number) => {
  return formatNumber(value, decimals, balanceFormatter);
};

export const formatAmount = (amountData?: AmountData): string => {
  if (!amountData) {
    return '';
  }

  const { decimals, symbol, value } = amountData;
  const displayValue = formatBalance(value, decimals);

  return `${displayValue} ${symbol}`;
};
