// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _AssetType } from '@soul-wallet/chain-list/types';

export type ChainInfo = {
  slug: string;
  name: string;
}

export interface ChainItemType {
  name: string;
  slug: string;
}

export interface TokenTypeItem {
  label: string;
  value: _AssetType;
}
