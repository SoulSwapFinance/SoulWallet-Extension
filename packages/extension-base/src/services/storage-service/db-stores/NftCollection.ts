// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NftCollection } from '@subwallet/extension-base/background/KoniTypes';
import { liveQuery } from 'dexie';

import BaseStoreWithChain from './BaseStoreWithChain';

export default class NftCollectionStore extends BaseStoreWithChain<NftCollection> {
  subscribeNftCollection (chains?: string[]) {
    return liveQuery(() => this.getNftCollection(chains));
  }

  getNftCollection (chainList?: string[]) {
    if (chainList && chainList.length > 0) {
      return this.table.where('chain').anyOfIgnoreCase(chainList).toArray();
    }

    return this.table.toArray();
  }

  removeCollection (chain: string, collectionId: string) {
    return this.table.where({
      chain,
      collectionId
    }).delete();
  }
}
