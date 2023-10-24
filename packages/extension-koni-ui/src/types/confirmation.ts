// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationDefinitions } from '@soul-wallet/extension-base/background/KoniTypes';

export type EvmSignatureSupportType = keyof Pick<ConfirmationDefinitions, 'evmSignatureRequest' | 'evmSendTransactionRequest' | 'evmWatchTransactionRequest'>;
