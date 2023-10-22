// Copyright 2019-2022 @polkadot/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AssetSetting } from '@soul-wallet/extension-base/background/KoniTypes';
import { EXTENSION_PREFIX } from '@soul-wallet/extension-base/defaults';
import SubscribableStore from '@soul-wallet/extension-base/stores/SubscribableStore';

// Not every asset has its setting stored, if not in store then it has default value (visible = false)
export default class AssetSettingStore extends SubscribableStore<Record<string, AssetSetting>> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}asset-setting` : null);
  }
}
