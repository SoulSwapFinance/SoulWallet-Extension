// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@soul-wallet/chain-list/types';
import { AbstractAddressJson, AccountJson } from '@subwallet/extension-base/background/types';
import { findChainInfoByChainId, findChainInfoByHalfGenesisHash } from '@subwallet/extension-base/services/chain-service/utils';
import { WalletConnectChainInfo } from '@subwallet/extension-koni-ui/types';
import { SessionTypes } from '@walletconnect/types';

import { findAccountByAddress } from '../account';

const WALLET_CONNECT_EIP155_NAMESPACE = 'eip155';

const WALLET_CONNECT_POLKADOT_NAMESPACE = 'polkadot';
export const chainsToWalletConnectChainInfos = (chainMap: Record<string, _ChainInfo>, chains: string[]): Array<WalletConnectChainInfo> => {
  return chains.map((chain) => {
    const [namespace, info] = chain.split(':');

    if (namespace === WALLET_CONNECT_EIP155_NAMESPACE) {
      const chainInfo = findChainInfoByChainId(chainMap, parseInt(info));

      return {
        chainInfo,
        slug: chainInfo?.slug || chain,
        supported: !!chainInfo
      };
    } else if (namespace === WALLET_CONNECT_POLKADOT_NAMESPACE) {
      const chainInfo = findChainInfoByHalfGenesisHash(chainMap, info);

      return {
        chainInfo,
        slug: chainInfo?.slug || chain,
        supported: !!chainInfo
      };
    } else {
      return {
        chainInfo: null,
        slug: chain,
        supported: false
      };
    }
  });
};

export const getWCAccountList = (accounts: AccountJson[], namespaces: SessionTypes.Namespaces): AbstractAddressJson[] => {
  const rawMap: Record<string, string> = {};
  const rawList = Object.values(namespaces).map((namespace) => namespace.accounts || []).flat();

  rawList.forEach((info) => {
    const [,, address] = info.split(':');

    rawMap[address] = address;
  });

  const convertMap: Record<string, AbstractAddressJson> = {};
  const convertList = Object.keys(rawMap).map((address): AbstractAddressJson | null => {
    const account = findAccountByAddress(accounts, address);

    if (account) {
      return {
        address: account.address,
        name: account.name
      };
    } else {
      return null;
    }
  });

  convertList.forEach((info) => {
    if (info) {
      convertMap[info.address] = info;
    }
  });

  return Object.values(convertMap);
};
