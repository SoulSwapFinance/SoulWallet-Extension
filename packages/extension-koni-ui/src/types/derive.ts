// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CreateDeriveAccountInfo } from '@subwallet/extension-base/background/KoniTypes';

export interface DeriveAccount extends CreateDeriveAccountInfo{
  address: string;
}
