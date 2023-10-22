// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TransactionHistoryItemJson } from 'background/KoniTypes';
import { EXTENSION_PREFIX } from 'defaults';
import SubscribableStore from 'stores/SubscribableStore';

export default class TransactionHistoryStoreV3 extends SubscribableStore<Record<string, TransactionHistoryItemJson>> {
  constructor () {
    super(`${EXTENSION_PREFIX}transaction3`);
  }
}
