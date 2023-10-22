// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SWError as SWErrorType } from '@soul-wallet/extension-base/background/KoniTypes';

export class SWError extends Error implements SWErrorType {
  errorType: string;
  code: number | undefined;
  data: unknown | undefined;

  constructor (errorType: string, message: string, code?: number, data?: unknown) {
    super(message);
    this.errorType = errorType;
    this.code = code;
    this.data = data;
  }

  public toJSON () {
    return {
      name: this.name,
      message: this.message,
      code: this.code
    };
  }
}
