// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TransactionHistoryItem } from '@soul-wallet/extension-base/background/KoniTypes';
import { SwIconProps } from '@subwallet/react-ui';

export interface TransactionHistoryDisplayData {
  className: string,
  typeName: string,
  name: string,
  title: string,
  icon: SwIconProps['phosphorIcon'],
}

export interface TransactionHistoryDisplayItem extends TransactionHistoryItem {
  displayData: TransactionHistoryDisplayData;
}
