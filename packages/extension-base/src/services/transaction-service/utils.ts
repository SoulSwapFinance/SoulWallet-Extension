// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@soul-wallet/chain-list/types';
import { ExtrinsicDataTypeMap, ExtrinsicType } from '../../background/KoniTypes';
import { _getBlockExplorerFromChain, _isPureEvmChain } from '../../services/chain-service/utils';

// @ts-ignore
export function parseTransactionData<T extends ExtrinsicType> (data: unknown): ExtrinsicDataTypeMap[T] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return data as ExtrinsicDataTypeMap[T];
}

function getBlockExplorerAccountRoute (explorerLink: string) {
  if (explorerLink.includes('explorer.subspace.network')) {
    return 'accounts';
  }

  if (explorerLink.includes('deeperscan.io')) {
    return 'account';
  }

  if (explorerLink.includes('subscan.io')) {
    return 'account';
  }

  return 'address';
}

function getBlockExplorerTxRoute (chainInfo: _ChainInfo) {
  if (_isPureEvmChain(chainInfo)) {
    return 'tx';
  }

  if (['aventus', 'deeper_network'].includes(chainInfo.slug)) {
    return 'transaction';
  }

  return 'extrinsic';
}

export function getExplorerLink (chainInfo: _ChainInfo, value: string, type: 'account' | 'tx'): string | undefined {
  const explorerLink = _getBlockExplorerFromChain(chainInfo);

  if (explorerLink && type === 'account') {
    const route = getBlockExplorerAccountRoute(explorerLink);

    return `${explorerLink}${explorerLink.endsWith('/') ? '' : '/'}${route}/${value}`;
  }

  if (explorerLink && value.startsWith('0x')) {
    const route = getBlockExplorerTxRoute(chainInfo);

    return (`${explorerLink}${explorerLink.endsWith('/') ? '' : '/'}${route}/${value}`);
  }

  return undefined;
}
