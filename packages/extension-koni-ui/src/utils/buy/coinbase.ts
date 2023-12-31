// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { generateOnRampURL } from '@coinbase/cbpay-js';
import { COINBASE_PAY_ID } from '@soul-wallet/extension-koni-ui/constants';
import { CreateBuyOrderFunction } from '@soul-wallet/extension-koni-ui/types';

export const createCoinbaseOrder: CreateBuyOrderFunction = (symbol, address, network) => {
  return new Promise((resolve) => {
    const onRampURL = generateOnRampURL({
      appId: COINBASE_PAY_ID,
      destinationWallets: [
        { address: address, supportedNetworks: [network], assets: [symbol] }
      ]
    });

    resolve(onRampURL);
  });
};
