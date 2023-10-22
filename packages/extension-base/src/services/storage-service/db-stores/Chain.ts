// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { IChain } from '@soul-wallet/extension-base/src/services/storage-service/databases';
import BaseStore from '@soul-wallet/extension-base/src/services/storage-service/db-stores/BaseStore';

export default class ChainStore extends BaseStore<IChain> {
  async getAll () {
    return this.table.toArray();
  }

  async removeChains (chains: string[]) {
    return this.table.where('slug').anyOfIgnoreCase(chains).delete();
  }
}
