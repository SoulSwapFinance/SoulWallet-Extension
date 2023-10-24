// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { sendMessage } from '@soul-wallet/extension-koni-ui/messaging/base';
import { KeyringAddress } from '@subwallet/ui-keyring/types';

export async function saveRecentAccount (accountId: string): Promise<KeyringAddress> {
  return sendMessage('pri(accounts.saveRecent)', { accountId });
}

export async function editContactAddress (address: string, name: string): Promise<boolean> {
  return sendMessage('pri(accounts.editContact)', { address: address, meta: { name: name } });
}

export async function removeContactAddress (address: string): Promise<boolean> {
  return sendMessage('pri(accounts.deleteContact)', { address: address });
}
