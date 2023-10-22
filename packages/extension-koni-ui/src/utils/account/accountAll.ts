// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@soul-wallet/extension-base/constants';

export function isAccountAll (address: string): boolean {
  return address === ALL_ACCOUNT_KEY;
}
