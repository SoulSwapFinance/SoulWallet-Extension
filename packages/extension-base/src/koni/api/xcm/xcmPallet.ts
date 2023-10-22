// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@soul-wallet/chain-list/src/types';
import { getBeneficiary, getDestinationChainLocation, getDestWeight, getTokenLocation } from '@subwallet/extension-base/koni/api/xcm/utils';

import { ApiPromise } from '@polkadot/api';

// this pallet is only used by Relaychains
export function getExtrinsicByXcmPalletPallet (tokenInfo: _ChainAsset, originChainInfo: _ChainInfo, destinationChainInfo: _ChainInfo, recipientAddress: string, value: string, api: ApiPromise) {
  const weightParam = getDestWeight();
  const xcmVer = 'V3';
  const destination = getDestinationChainLocation(originChainInfo, destinationChainInfo, xcmVer);
  const beneficiary = getBeneficiary(destinationChainInfo, recipientAddress, xcmVer);
  const tokenLocation = getTokenLocation(tokenInfo, value, xcmVer);

  let method = 'limitedReserveTransferAssets';

  if (['statemint', 'statemine'].includes(destinationChainInfo.slug)) {
    method = 'limitedTeleportAssets';
  }

  return api.tx.xcmPallet[method](
    destination,
    beneficiary,
    tokenLocation,
    0,
    weightParam
  );
}
