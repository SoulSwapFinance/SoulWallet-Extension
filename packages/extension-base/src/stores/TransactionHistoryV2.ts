// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TxHistoryItem } from 'background/KoniTypes';
import { EXTENSION_PREFIX } from 'defaults';
import SubscribableStore from 'stores/SubscribableStore';

export default class TransactionHistoryStoreV2 extends SubscribableStore<Record<string, TxHistoryItem[]>> {
  constructor () {
    super(`${EXTENSION_PREFIX}transaction`);
  }
}
