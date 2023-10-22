// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { sendMessage } from '../base';

export async function editAccount (address: string, name: string): Promise<boolean> {
  return sendMessage('pri(accounts.edit)', { address, name });
}

export async function forgetAccount (address: string, lockAfter = false): Promise<boolean> {
  return sendMessage('pri(accounts.forget)', { address, lockAfter });
}
