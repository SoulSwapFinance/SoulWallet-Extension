// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import useOpenQrScanner from '@soul-wallet/extension-koni-ui/hooks/qr/useOpenQrScanner';
import { ValidateState } from '@soul-wallet/extension-koni-ui/types';
import { QrAccount, ScannerResult } from '@soul-wallet/extension-koni-ui/types/scanner';
import { useCallback, useMemo } from 'react';

import { useTranslation } from '../common';

const useScanAccountQr = (
  modalId: string,
  convertResult: (data: string) => QrAccount | null,
  setValidateState: (state: ValidateState) => void,
  onSubmit: (_account: QrAccount) => void
) => {
  const { t } = useTranslation();
  const onOpen = useOpenQrScanner(modalId);

  const handleResult = useCallback((val: string): QrAccount | null => {
    const result = convertResult(val);

    if (result) {
      return result;
    } else {
      setValidateState({
        message: t('Invalid QR code'),
        status: 'error'
      });

      return null;
    }
  }, [t, convertResult, setValidateState]);

  const openCamera = useCallback(() => {
    setValidateState({});
    onOpen();
  }, [onOpen, setValidateState]);

  const onSuccess = useCallback((result: ScannerResult) => {
    const rs = handleResult(result.text);

    if (rs) {
      onSubmit(rs);
    }
  }, [handleResult, onSubmit]);

  const onClose = useCallback(() => {
    setValidateState({});
  }, [setValidateState]);

  const onError = useCallback((error: string) => {
    setValidateState({
      message: error,
      status: 'error'
    });
  }, [setValidateState]);

  return useMemo(() => ({
    openCamera,
    onSuccess,
    onClose,
    onError
  }), [onClose, onError, onSuccess, openCamera]);
};

export default useScanAccountQr;
