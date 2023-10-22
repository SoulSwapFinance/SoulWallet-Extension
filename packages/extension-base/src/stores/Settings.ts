// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestSettingsType } from '@soul-wallet/extension-base/src/background/KoniTypes';
import { EXTENSION_PREFIX } from '@soul-wallet/extension-base/src/defaults';
import SubscribableStore from '@soul-wallet/extension-base/src/stores/SubscribableStore';

export default class SettingsStore extends SubscribableStore<RequestSettingsType> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}settings` : null);
  }
}
