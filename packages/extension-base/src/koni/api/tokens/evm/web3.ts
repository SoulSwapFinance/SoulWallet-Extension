// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ERC20_ABI } from '@soul-wallet/extension-base/src/services/chain-service/helper';
import { _EvmApi } from '@soul-wallet/extension-base/src/services/chain-service/types';
import { Contract } from 'web3-eth-contract';

export const getERC20Contract = (networkKey: string, assetAddress: string, evmApiMap: Record<string, _EvmApi>, options = {}): Contract => {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
  return new evmApiMap[networkKey].api.eth.Contract(_ERC20_ABI, assetAddress, options);
};
