// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@soul-wallet/chain-list/types';
import { _getChainNativeTokenBasicInfo } from '@subwallet/extension-base/services/chain-service/utils';
import { createRegistry } from '@subwallet/extension-base/utils';
import { metadataExpand } from '@subwallet/extension-chains';
import { Chain } from '@subwallet/extension-chains/types';
import { MetadataDef } from '@soul-wallet/extension-inject/types';
import { sendMessage } from '@subwallet/extension-koni-ui/messaging/base';
import { _getKnownHashes, _getKnownNetworks, findChainInfoByGenesisHash } from '@subwallet/extension-koni-ui/utils';

import { HexString } from '@polkadot/util/types';

import { getSavedMeta, setSavedMeta } from './MetadataCache';

export async function getAllMetadata (): Promise<MetadataDef[]> {
  return sendMessage('pri(metadata.list)');
}

export async function getMetadata (genesisHash?: string | null, isPartial = false): Promise<Chain | null> {
  if (!genesisHash) {
    return null;
  }

  // const chains = await getNetworkMap();
  const parsedChains = _getKnownHashes({});

  let request = getSavedMeta(genesisHash);

  if (!request) {
    request = sendMessage('pri(metadata.get)', genesisHash || null);
    setSavedMeta(genesisHash, request);
  }

  const def = await request;

  if (def) {
    return metadataExpand(def, isPartial);
  } else if (isPartial) {
    const chain = parsedChains.find((chain) => chain.genesisHash === genesisHash);

    if (chain) {
      return metadataExpand({
        ...chain,
        specVersion: 0,
        tokenDecimals: 15,
        tokenSymbol: 'Unit',
        types: {}
      }, isPartial);
    }
  }

  return null;
}

export async function getMetadataRaw (chainInfoMap: Record<string, _ChainInfo>, genesisHash?: string | null): Promise<Chain | null> {
  if (!genesisHash) {
    return null;
  }

  const { rawMetadata, specVersion } = await sendMessage('pri(metadata.find)', { genesisHash });

  if (!rawMetadata) {
    return null;
  }

  const chainInfo = findChainInfoByGenesisHash(chainInfoMap, genesisHash);

  if (!chainInfo) {
    return null;
  }

  const registry = createRegistry(chainInfo, rawMetadata as HexString);

  const tokenInfo = _getChainNativeTokenBasicInfo(chainInfo);

  return {
    specVersion,
    genesisHash,
    name: chainInfo.name,
    hasMetadata: true,
    definition: {} as MetadataDef,
    icon: chainInfo.icon,
    registry: registry,
    isUnknown: false,
    ss58Format: chainInfo.substrateInfo?.addressPrefix || 42,
    tokenDecimals: tokenInfo.decimals,
    tokenSymbol: tokenInfo.symbol
  };
}

export async function getChainMetadata (genesisHash?: string | null): Promise<Chain | null> {
  if (!genesisHash) {
    return null;
  }

  // const chains = await getNetworkMap();
  const parsedChains = _getKnownNetworks({});

  let request = getSavedMeta(genesisHash);

  if (!request) {
    request = sendMessage('pri(metadata.get)', genesisHash || null);
    setSavedMeta(genesisHash, request);
  }

  const def = await request;

  if (def) {
    return metadataExpand(def, false);
  } else {
    const chain = parsedChains.find((chain) => chain.genesisHash === genesisHash);

    if (chain) {
      return metadataExpand({
        specVersion: 0,
        tokenDecimals: 15,
        tokenSymbol: 'Unit',
        types: {},
        ...chain
      }, false);
    }
  }

  return null;
}
