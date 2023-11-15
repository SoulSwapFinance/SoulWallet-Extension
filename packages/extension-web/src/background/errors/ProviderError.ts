// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SWError } from '@soul-wallet/extension-base/background/errors/SWError';
import { ProviderErrorType } from '@soul-wallet/extension-base/background/KoniTypes';
import { detectTranslate } from '@soul-wallet/extension-base/utils';

const defaultErrorMap: Record<ProviderErrorType, { message: string, code?: number }> = {
  CHAIN_DISCONNECTED: {
    message: detectTranslate('Network is disconnected'),
    code: undefined
  },
  INVALID_PARAMS: {
    message: detectTranslate('Undefined error. Please contact SoulWallet support'),
    code: undefined
  },
  INTERNAL_ERROR: {
    message: detectTranslate('Undefined error. Please contact SoulWallet support'),
    code: undefined
  },
  USER_REJECT: {
    message: detectTranslate('Rejected by user'),
    code: undefined
  }
};

export class ProviderError extends SWError {
  override errorType: ProviderErrorType;

  constructor (errorType: ProviderErrorType, errMessage?: string, data?: unknown) {
    const { code, message } = defaultErrorMap[errorType];

    super(errorType, errMessage || message, code, data);

    this.errorType = errorType;
  }
}
