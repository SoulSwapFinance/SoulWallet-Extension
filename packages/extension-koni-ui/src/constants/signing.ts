// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationType } from '@soul-wallet/extension-koni-ui/stores/base/RequestState';
import { AccountSignMode } from '@soul-wallet/extension-koni-ui/types/account';

export const MODE_CAN_SIGN: AccountSignMode[] = [AccountSignMode.PASSWORD, AccountSignMode.QR, AccountSignMode.LEDGER];

export const NEED_SIGN_CONFIRMATION: ConfirmationType[] = ['evmSignatureRequest', 'evmSendTransactionRequest', 'signingRequest'];
