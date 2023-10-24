// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TransactionContext } from '@soul-wallet/extension-koni-ui/contexts/TransactionContext';
import { TransactionFormBaseProps } from '@soul-wallet/extension-koni-ui/types';
import { FormInstance } from '@subwallet/react-ui';
import { useContext, useEffect } from 'react';

const useRestoreTransaction = <T extends TransactionFormBaseProps>(form: FormInstance<T>) => {
  const { needPersistData, persistData } = useContext(TransactionContext);

  useEffect(() => {
    if (needPersistData) {
      persistData(form.getFieldsValue());
    }
  }, [form, needPersistData, persistData]);
};

export default useRestoreTransaction;
