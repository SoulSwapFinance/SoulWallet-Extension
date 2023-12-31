// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import useGetAccountByAddress from '@soul-wallet/extension-koni-ui/hooks/account/useGetAccountByAddress';
import { AccountSignMode } from '@soul-wallet/extension-koni-ui/types/account';
import { getSignMode } from '@soul-wallet/extension-koni-ui/utils/account/account';
import { useMemo } from 'react';

const useGetAccountSignModeByAddress = (address?: string): AccountSignMode => {
  const account = useGetAccountByAddress(address);

  return useMemo((): AccountSignMode => {
    return getSignMode(account);
  }, [account]);
};

export default useGetAccountSignModeByAddress;
