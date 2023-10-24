// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DefaultLogosMap } from '@soul-wallet/extension-koni-ui/assets/logo';

const SwLogosMap: Record<string, string> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  subwallet: require('./subwallet.png'),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  avatar_placeholder: require('./avatar_placeholder.png'),
  default: DefaultLogosMap.default,
  transak: DefaultLogosMap.transak,
  onramper: DefaultLogosMap.onramper,
  moonpay: DefaultLogosMap.moonpay,
  banxa: DefaultLogosMap.banxa,
  coinbase: DefaultLogosMap.coinbase
};

export default SwLogosMap;
