// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@soul-wallet/chain-list/types';
import BaseStore from '@subwallet/extension-base/services/storage-service/db-stores/BaseStore';

export default class AssetStore extends BaseStore<_ChainAsset> {
  async getAll () {
    return this.table.toArray();
  }

  async removeAssets (keys: string[]) {
    return this.table.where('slug').anyOfIgnoreCase(keys).delete();
  }
}
