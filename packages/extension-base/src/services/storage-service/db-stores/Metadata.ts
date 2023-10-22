// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { IMetadataItem } from '@soul-wallet/extension-base/services/storage-service/databases';
import BaseStoreWithChain from '@soul-wallet/extension-base/services/storage-service/db-stores/BaseStoreWithChain';

export default class MetadataStore extends BaseStoreWithChain<IMetadataItem> {
  getMetadata (chain: string) {
    return this.table.where('chain').equals(chain).first();
  }

  upsertMetadata (chain: string, metadata: IMetadataItem) {
    return this.table.put(metadata, chain);
  }

  getMetadataByGenesisHash (genesisHash: string) {
    return this.table.get(genesisHash);
  }

  updateMetadataByGenesisHash (genesisHash: string, metadata: IMetadataItem) {
    return this.table.put(metadata, genesisHash);
  }
}
