// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationDefinitions } from '@subwallet/extension-base/background/KoniTypes';
import { EvmSignatureSupportType } from '@soul-wallet/extension-koni-ui/types/confirmation';

import { ExtrinsicPayload } from '@polkadot/types/interfaces';

export const isSubstrateMessage = (payload: string | ExtrinsicPayload): payload is string => typeof payload === 'string';

export const isEvmMessage = (request: ConfirmationDefinitions[EvmSignatureSupportType][0]): request is ConfirmationDefinitions['evmSignatureRequest'][0] => {
  return !!(request as ConfirmationDefinitions['evmSignatureRequest'][0]).payload.type;
};
