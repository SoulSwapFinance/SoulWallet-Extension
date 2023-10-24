// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TransactionFormBaseProps } from '@soul-wallet/extension-koni-ui/types';
import { Form, FormInstance } from '@subwallet/react-ui';
import { useIsFirstRender } from 'usehooks-ts';

const useWatchTransaction = <T extends TransactionFormBaseProps, K extends keyof T>(key: K, form: FormInstance<T>, defaultData: T): T[K] => {
  const isFirstRender = useIsFirstRender();
  const watch = Form.useWatch(key, form);

  return isFirstRender ? defaultData[key] : watch;
};

export default useWatchTransaction;
