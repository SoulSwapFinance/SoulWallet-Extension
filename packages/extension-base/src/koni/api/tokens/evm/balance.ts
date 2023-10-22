// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _EvmApi } from '@soul-wallet/extension-base/src/services/chain-service/types';

export async function getEVMBalance (networkKey: string, addresses: string[], evmApiMap: Record<string, _EvmApi>): Promise<string[]> {
  const web3Api = evmApiMap[networkKey];

  return await Promise.all(addresses.map(async (address) => {
    return await web3Api.api.eth.getBalance(address);
  }));
}
