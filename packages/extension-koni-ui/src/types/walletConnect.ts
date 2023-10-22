// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ChainInfo } from '@subwallet/extension-koni-ui/types/chain';

export interface WalletConnectChainInfo {
  chainInfo: ChainInfo | null;
  slug: string;
  supported: boolean;
}
