// Copyright 2023 @soul-wallet/sub-connect authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getLocalStorage, setLocalStorage } from '@soul-wallet/extension-koni-ui/utils/localStorage';
import { useCallback, useState } from 'react';

export function useLocalStorage<T = string> (key: string, initialValue: T = '' as unknown as T): [T, (v: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(getLocalStorage<T>(key, initialValue));

  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value);
      setLocalStorage<T>(key, value);
    },
    [key]
  );

  return [storedValue, setValue];
}
