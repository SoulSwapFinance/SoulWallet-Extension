// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { PassPhishing } from 'background/KoniTypes';
import { EXTENSION_PREFIX } from 'defaults';
import SubscribableStore from 'stores/SubscribableStore';

export default class PassPhishingStore extends SubscribableStore<Record<string, PassPhishing>> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}subwallet-pass-phishing-list` : null);
  }
}
