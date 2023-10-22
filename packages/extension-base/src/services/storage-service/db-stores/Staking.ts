// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { StakingItem, StakingType } from '@soul-wallet/extension-base/src/background/KoniTypes';
import BaseStoreWithAddressAndChain from '@soul-wallet/extension-base/src/services/storage-service/db-stores/BaseStoreWithAddressAndChain';
import { liveQuery } from 'dexie';

export default class StakingStore extends BaseStoreWithAddressAndChain<StakingItem> {
  getSingleRecord (chain: string, address: string, type: StakingType) {
    return this.table.where('[chain+address+type]').equals([chain, address, type]).first();
  }

  getStakings (addresses: string[], chainList: string[] = []) {
    if (addresses.length) {
      return this.table.where('address').anyOfIgnoreCase(addresses).and((item) => (chainList && chainList.includes(item.chain)) && parseFloat(item.balance as string) > 0).toArray();
    }

    return this.table.filter((item) => (chainList && chainList.includes(item.chain)) && parseFloat(item.balance as string) > 0).toArray();
  }

  getStakingsByChains (chainList: string[]) {
    return this.table.filter((item) => (chainList.includes(item.chain)) && parseFloat(item.balance as string) > 0).toArray();
  }

  getPooledStakings (addresses: string[], chainList: string[] = []) {
    if (addresses.length) {
      return this.table.where('address').anyOfIgnoreCase(addresses).and((item) =>
        (!chainList.length || chainList.includes(item.chain)) &&
        parseFloat(item.balance as string) > 0 &&
        item.type === StakingType.POOLED)
        .toArray();
    }

    return this.table.filter((item) =>
      (!chainList.length || chainList.includes(item.chain)) &&
      parseFloat(item.balance as string) > 0 &&
      item.type === StakingType.POOLED)
      .toArray();
  }

  subscribeStaking (addresses: string[], chainList: string[] = []) {
    return liveQuery(
      () => this.getStakings(addresses, chainList)
    );
  }
}
