// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SignerPayloadJSON, SignerPayloadRaw } from '@polkadot/types/types';

export const isRawPayload = (payload: SignerPayloadJSON | SignerPayloadRaw): payload is SignerPayloadRaw => {
  return !!(payload as SignerPayloadRaw).data;
};
