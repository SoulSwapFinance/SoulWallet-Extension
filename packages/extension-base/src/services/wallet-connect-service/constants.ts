// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EIP155_SIGNING_METHODS, POLKADOT_SIGNING_METHODS, WalletConnectSigningMethod } from '../../services/wallet-connect-service/types';
import { isMobile } from '../../utils';
import { SignClientTypes } from '@walletconnect/types';

export const PROJECT_ID_EXTENSION = '9afead59d3361bb53853d2f2b0cd6a02'; // updated for SoulSwap
export const PROJECT_ID_MOBILE = '9afead59d3361bb53853d2f2b0cd6a02'; // updated for SoulSwap
export const RELAY_URL = 'wss://relay.walletconnect.com';

export const DEFAULT_WALLET_CONNECT_OPTIONS: SignClientTypes.Options = {
  logger: 'debug',
  projectId: !isMobile ? PROJECT_ID_EXTENSION : PROJECT_ID_MOBILE,
  relayUrl: RELAY_URL,
  metadata: {
    name: 'SoulWallet',
    description: 'React Wallet for WalletConnect',
    url: 'https://app.soulswap.finance/',
    icons: ['https://raw.githubusercontent.com/soulswapfinance/assets/prod/blockchains/fantom/assets/0xe2fb177009FF39F52C0134E8007FA0e4BaAcBd07/logo.png']
  }
};

export const ALL_WALLET_CONNECT_EVENT: SignClientTypes.Event[] = ['session_proposal', 'session_update', 'session_extend', 'session_ping', 'session_delete', 'session_expire', 'session_request', 'session_request_sent', 'session_event', 'proposal_expire'];

export const WALLET_CONNECT_SUPPORTED_METHODS: WalletConnectSigningMethod[] = [
  POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_MESSAGE,
  POLKADOT_SIGNING_METHODS.POLKADOT_SIGN_TRANSACTION,
  EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION,
  EIP155_SIGNING_METHODS.PERSONAL_SIGN,
  EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V1,
  EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3,
  EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4
];

export const WALLET_CONNECT_REQUEST_KEY = 'wallet-connect';

export const WALLET_CONNECT_EIP155_NAMESPACE = 'eip155';
export const WALLET_CONNECT_POLKADOT_NAMESPACE = 'polkadot';

export const WALLET_CONNECT_SUPPORT_NAMESPACES: string[] = [WALLET_CONNECT_EIP155_NAMESPACE, WALLET_CONNECT_POLKADOT_NAMESPACE];
