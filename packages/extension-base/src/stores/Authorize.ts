// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AuthUrls } from '@soul-wallet/extension-base/src/background/handlers/State';
import { EXTENSION_PREFIX } from '@soul-wallet/extension-base/src/defaults';
import SubscribableStore from '@soul-wallet/extension-base/src/stores/SubscribableStore';

export default class AuthorizeStore extends SubscribableStore<AuthUrls> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}authorize` : null);
  }
}
