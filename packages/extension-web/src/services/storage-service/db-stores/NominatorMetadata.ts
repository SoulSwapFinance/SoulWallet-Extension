// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NominatorMetadata, StakingStatus } from '@soul-wallet/extension-base/background/KoniTypes';
import BaseStoreWithAddressAndChain from '@soul-wallet/extension-base/services/storage-service/db-stores/BaseStoreWithAddressAndChain';
import { liveQuery } from 'dexie';

export default class NominatorMetadataStore extends BaseStoreWithAddressAndChain<NominatorMetadata> {
  async getAll () {
    return this.table.filter((item) => item.status !== StakingStatus.NOT_STAKING).toArray();
  }

  subscribeByAddresses (addresses: string[]) {
    return liveQuery(
      () => this.getByAddress(addresses)
    );
  }

  subscribeAll () {
    return liveQuery(
      () => this.getAll()
    );
  }

  getByAddress (addresses: string[]) {
    return this.table.where('address').anyOfIgnoreCase(addresses).and((item) => item.status !== StakingStatus.NOT_STAKING).toArray();
  }

  async removeByAddress (address: string) {
    return this.table.where('address').anyOfIgnoreCase(address).delete();
  }
}
