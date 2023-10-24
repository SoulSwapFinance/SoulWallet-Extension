// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ResponseAccountExportPrivateKey } from '@soul-wallet/extension-base/background/KoniTypes';
import { sendMessage } from '@soul-wallet/extension-koni-ui/messaging';
import { KeyringPair$Json } from '@subwallet/keyring/types';
import { KeyringPairs$Json } from '@subwallet/ui-keyring/types';

// JSON
export async function exportAccount (address: string, password: string): Promise<{ exportedJson: KeyringPair$Json }> {
  return sendMessage('pri(accounts.export)', { address, password });
}

export async function exportAccountPrivateKey (address: string, password: string): Promise<ResponseAccountExportPrivateKey> {
  return sendMessage('pri(accounts.exportPrivateKey)', { address, password });
}

export async function exportAccounts (addresses: string[], password: string): Promise<{ exportedJson: KeyringPairs$Json }> {
  return sendMessage('pri(accounts.batchExport)', { addresses, password });
}
