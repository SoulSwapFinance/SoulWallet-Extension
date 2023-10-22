// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CurrentAccountInfo } from '@soul-wallet/extension-base/background/KoniTypes';
import { RequestCurrentAccountAddress } from '@soul-wallet/extension-base/background/types';
import { sendMessage } from '@subwallet/extension-koni-ui/messaging/base';

export async function saveCurrentAccountAddress (data: RequestCurrentAccountAddress): Promise<CurrentAccountInfo> {
  return sendMessage('pri(currentAccount.saveAddress)', data);
}
