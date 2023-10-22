// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestSettingsType } from '@subwallet/extension-base/background/KoniTypes';
import { EXTENSION_PREFIX } from '@subwallet/extension-base/defaults';
import SubscribableStore from '@subwallet/extension-base/stores/SubscribableStore';

export default class SettingsStore extends SubscribableStore<RequestSettingsType> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}settings` : null);
  }
}
