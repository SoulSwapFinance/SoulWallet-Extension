// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DefaultDocWithAddressAndChain } from '@soul-wallet/extension-base/services/storage-service/databases';
import BaseStore from '@soul-wallet/extension-base/services/storage-service/db-stores/BaseStore';

export default class BaseStoreWithAddressAndChain<T extends DefaultDocWithAddressAndChain> extends BaseStore<T> {
  public convertToJsonObject (items: T[]): Record<string, T> {
    return items.reduce((a, v) => ({ ...a, [v.chain]: v }), {});
  }

  public removeAllByAddress (address: string) {
    return this.table.where('address').equalsIgnoreCase(address).delete();
  }

  async getDataByAddressAsObject (address: string) {
    const data = await this.table.where('address').equals(address).toArray();

    return this.convertToJsonObject(data);
  }
}
