// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SWError } from '@soul-wallet/extension-base/background/errors/SWError';
import { EvmProviderErrorType } from '@soul-wallet/extension-base/background/KoniTypes';
import { detectTranslate } from '@soul-wallet/extension-base/utils';
import { t } from 'i18next';

const defaultErrorMap: Record<EvmProviderErrorType, { message: string, code?: number }> = {
  USER_REJECTED_REQUEST: {
    message: detectTranslate('User Rejected Request'),
    code: 4001
  },
  UNAUTHORIZED: {
    message: detectTranslate('Failed to sign'),
    code: 4100
  },
  UNSUPPORTED_METHOD: {
    message: detectTranslate('Unsupported Method'),
    code: 4200
  },
  DISCONNECTED: {
    message: detectTranslate('Network is disconnected'),
    code: 4900
  },
  CHAIN_DISCONNECTED: {
    message: detectTranslate('Network is disconnected'),
    code: 4901
  },
  INVALID_PARAMS: {
    message: detectTranslate('Undefined error. Please contact support'),
    code: -32602
  },
  INTERNAL_ERROR: {
    message: detectTranslate('Undefined error. Please contact support'),
    code: -32603
  }
};

export class EvmProviderError extends SWError {
  override errorType: EvmProviderErrorType;

  constructor (errorType: EvmProviderErrorType, errMessage?: string, data?: unknown) {
    const { code, message } = defaultErrorMap[errorType];
    const finalMessage = errMessage || t(message || '') || errorType;

    super(errorType, finalMessage, code, data);
    this.errorType = errorType;
  }
}
