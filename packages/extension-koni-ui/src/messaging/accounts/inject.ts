// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { InjectedAccountWithMeta } from '@soul-wallet/extension-inject/types';
import { sendMessage } from '@subwallet/extension-koni-ui/messaging/base';

export async function addInjects (accounts: InjectedAccountWithMeta[]): Promise<boolean> {
  return sendMessage('pri(accounts.inject.add)', { accounts });
}

export async function removeInjects (addresses: string[]): Promise<boolean> {
  return sendMessage('pri(accounts.inject.remove)', { addresses });
}
