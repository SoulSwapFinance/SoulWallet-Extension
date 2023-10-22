// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AssetRefMap, ChainAssetMap, ChainInfoMap } from '@soul-wallet/chain-list';
import { _AssetRef } from '@soul-wallet/chain-list/types';
import { createXcmExtrinsic } from '@subwallet/extension-base/koni/api/xcm';
import { SubstrateChainHandler } from '@subwallet/extension-base/services/chain-service/handler/SubstrateChainHandler';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _isChainEvmCompatible } from '@subwallet/extension-base/services/chain-service/utils';

import { cryptoWaitReady } from '@polkadot/util-crypto';

jest.setTimeout(1000 * 60 * 10);

const destAddress1 = '5DnokDpMdNEH8cApsZoWQnjsggADXQmGWUb6q8ZhHeEwvncL';
const destAddress2 = '0x49E46fc304a448A2132d2DBEd6df47D0084cE92f';

const uniqueArray = (array: string[]): string[] => {
  const map: Record<string, string> = {};

  array.forEach((v) => {
    map[v] = v;
  });

  return Object.keys(map);
};

describe('test token transfer', () => {
  let substrateChainHandler: SubstrateChainHandler;
  const substrateApiMap: Record<string, _SubstrateApi> = {};

  beforeAll(async () => {
    await cryptoWaitReady();

    substrateChainHandler = new SubstrateChainHandler();
  });

  it('substrate transfer', async () => {
    const rawSrcChains = Object.values(AssetRefMap).map((value) => value.srcChain);
    const srcChains = uniqueArray(rawSrcChains);
    const errorList: string[] = [];

    console.log('srcChains', srcChains);

    for (const srcChain of srcChains) {
      const assetRef = Object.values(AssetRefMap).find((ref) => ref.srcChain === srcChain);

      if (!assetRef) {
        continue;
      }

      const chain = ChainInfoMap[srcChain];

      const api = await substrateChainHandler.initApi(srcChain, chain.providers[Object.keys(chain.providers)[0]]);
      const substrateApi = await api.isReady;

      const originTokenInfo = ChainAssetMap[assetRef.srcAsset];
      const destinationTokenInfo = ChainAssetMap[assetRef.destAsset];
      const destChain = ChainInfoMap[assetRef.destChain];
      const isDestChainEvm = _isChainEvmCompatible(destChain);
      const destAddress = isDestChainEvm ? destAddress2 : destAddress1;

      try {
        await createXcmExtrinsic({
          destinationTokenInfo,
          originTokenInfo,
          sendingValue: '0',
          recipient: destAddress,
          chainInfoMap: ChainInfoMap,
          substrateApi
        });
      } catch (e) {
        console.log(e);
        errorList.push(srcChain);
      }
    }

    console.log(errorList);
  });

  it('xcm check', async () => {
    const rawSrcChains = Object.values(AssetRefMap).map((value) => value.srcChain);
    const errorList: _AssetRef[] = [];

    await Promise.all(rawSrcChains.map(async (srcChain) => {
      const chainInfo = ChainInfoMap[srcChain];

      substrateApiMap[chainInfo.slug] = await substrateChainHandler.initApi(srcChain, chainInfo.providers[Object.keys(chainInfo.providers)[0]]);
    }));

    for (const assetRef of Object.values(AssetRefMap)) {
      const substrateApi = await substrateApiMap[assetRef.srcChain].isReady;
      const destinationTokenInfo = ChainAssetMap[assetRef.destAsset];
      const originTokenInfo = ChainAssetMap[assetRef.srcAsset];
      const isDestChainEvm = _isChainEvmCompatible(ChainInfoMap[assetRef.destChain]);
      const destAddress = isDestChainEvm ? destAddress2 : destAddress1;

      try {
        await createXcmExtrinsic({
          destinationTokenInfo,
          originTokenInfo,
          sendingValue: '0',
          recipient: destAddress,
          chainInfoMap: ChainInfoMap,
          substrateApi
        });
      } catch (e) {
        console.log('error', e);
        errorList.push(assetRef);
      }
    }

    console.log('errorList', errorList);
  });
});
