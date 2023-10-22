// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BasicTxWarningCode, TransactionWarningType } from '@soul-wallet/extension-base/src/background/KoniTypes';
import { SWWarning } from '@soul-wallet/extension-base/src/background/warnings/SWWarning';
import { detectTranslate } from '@soul-wallet/extension-base/src/utils';
import { t } from 'i18next';

const defaultWarningMap: Record<TransactionWarningType, { message: string, code?: number }> = {
  [BasicTxWarningCode.NOT_ENOUGH_EXISTENTIAL_DEPOSIT]: {
    message: detectTranslate('Insufficient balance to cover existential deposit. Please decrease the transaction amount or increase your current balance'),
    code: undefined
  }
};

export class TransactionWarning extends SWWarning {
  override warningType: TransactionWarningType;

  constructor (warningType: TransactionWarningType, message?: string, code?: number, data?: unknown) {
    const warningMessage = message || t(defaultWarningMap[warningType]?.message || '') || warningType;

    super(warningType, warningMessage, defaultWarningMap[warningType]?.code, data);
    this.warningType = warningType;
  }
}
