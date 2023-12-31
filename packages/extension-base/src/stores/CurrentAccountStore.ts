// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CurrentAccountInfo } from '@soul-wallet/extension-base/background/KoniTypes';
import { EXTENSION_PREFIX } from '@soul-wallet/extension-base/defaults';
import SubscribableStore from '@soul-wallet/extension-base/stores/SubscribableStore';

export default class CurrentAccountStore extends SubscribableStore<CurrentAccountInfo> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}current_account` : null);
  }
}
