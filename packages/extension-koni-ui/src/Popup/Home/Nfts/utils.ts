// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NftCollection, NftItem } from '@soul-wallet/extension-base/background/KoniTypes';

export interface INftCollectionDetail {
  collectionInfo: NftCollection,
  nftList: NftItem[]
}

export interface INftItemDetail {
  collectionInfo: NftCollection,
  nftItem: NftItem
}

// might set perPage based on screen height
export const NFT_PER_PAGE = 4;
