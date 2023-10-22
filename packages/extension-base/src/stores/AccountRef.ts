// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountRef } from '@soul-wallet/extension-base/src/background/KoniTypes';
import { EXTENSION_PREFIX } from '@soul-wallet/extension-base/src/defaults';
import SubscribableStore from '@soul-wallet/extension-base/src/stores/SubscribableStore';

export default class AccountRefStore extends SubscribableStore<Array<AccountRef>> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}account_link` : null);
  }
}
