// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BANXA_URL } from '@soul-wallet/extension-koni-ui/constants';
import { CreateBuyOrderFunction } from '@soul-wallet/extension-koni-ui/types';
import qs from 'querystring';

export const createBanxaOrder: CreateBuyOrderFunction = (token, address, network) => {
  return new Promise((resolve) => {
    const params = {
      coinType: token,
      blockchain: network,
      walletAddress: address,
      orderType: 'BUY'
    };

    const query = qs.stringify(params);

    resolve(`${BANXA_URL}?${query}`);
  });
};
