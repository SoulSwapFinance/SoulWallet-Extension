// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TxHistoryItem } from '@subwallet/extension-base/background/KoniTypes';
import { EXTENSION_PREFIX } from '@subwallet/extension-base/defaults';
import SubscribableStore from '@subwallet/extension-base/stores/SubscribableStore';

export default class TransactionHistoryStoreV2 extends SubscribableStore<Record<string, TxHistoryItem[]>> {
  constructor () {
    super(`${EXTENSION_PREFIX}transaction`);
  }
}
