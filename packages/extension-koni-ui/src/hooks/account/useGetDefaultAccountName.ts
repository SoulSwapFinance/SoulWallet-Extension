// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RootState } from '@subwallet/extension-koni-ui/stores';
import { isAccountAll } from '@subwallet/extension-koni-ui/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const useGetDefaultAccountName = () => {
  const { accounts } = useSelector((state: RootState) => state.accountState);

  return useMemo(() => {
    const filtered = accounts.filter((account) => !isAccountAll(account.address));

    return `Account ${filtered.length + 1}`;
  }, [accounts]);
};

export default useGetDefaultAccountName;
