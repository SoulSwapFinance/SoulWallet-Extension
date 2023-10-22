// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RuntimeInfo } from 'utils';

export const SINGULAR_V1_ENDPOINT = 'https://singular.rmrk-api.xyz/api/account-rmrk1/';

export const SINGULAR_V2_ENDPOINT = 'https://singular.rmrk-api.xyz/api/account/';

export const KANARIA_ENDPOINT = 'https://kanaria.rmrk.app/api/rmrk2/';

export const RMRK_PINATA_SERVER = 'https://rmrk.mypinata.cloud/ipfs/';

export const SINGULAR_V1_COLLECTION_ENDPOINT = 'https://singular.rmrk.app/api/rmrk1/collection/';

export const SINGULAR_V2_COLLECTION_ENDPOINT = 'https://singular.app/api/rmrk2/collection/';

export const KANARIA_EXTERNAL_SERVER = 'https://kanaria.rmrk.app/catalogue/';

export const CLOUDFLARE_PINATA_SERVER = 'https://cloudflare-ipfs.com/ipfs/';

export const BIT_COUNTRY_IPFS_SERVER = 'https://ipfs-cdn.bit.country/';

export const BIT_COUNTRY_LAND_ESTATE_METADATA_API = 'https://pioneer-api.bit.country/metadata/landTokenUriPioneer';

export const BIT_COUNTRY_THUMBNAIL_RESOLVER = 'https://res.cloudinary.com/ddftctzph/image/upload/c_scale,q_100,w_250/production-ipfs/asset/';

export const CF_IPFS_GATEWAY = 'https://cf-ipfs.com/ipfs/';

export const PINATA_IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export const UNIQUE_SCAN_ENDPOINT = 'https://explorer-api.unique.network/v1/graphql';

export const QUARTZ_SCAN_ENDPOINT = 'https://hasura-quartz.unique.network/v1/graphql';

export const VARA_SCAN_ENDPOINT = 'https://nft-explorer.vara-network.io/graphql';

// GATEWAY

export const UNIQUE_IPFS_GATEWAY = 'https://ipfs.unique.network/ipfs/';

export const NFT_STORAGE_GATEWAY = 'https://nftstorage.link/ipfs/';

export const IPFS_W3S_LINK = 'https://w3s.link/ipfs/';

export const GATEWAY_IPFS_IO = 'https://gateway.ipfs.io/ipfs/';

export const IPFS_IO = 'https://ipfs.io/ipfs/';

export const DWEB_LINK = 'https://dweb.link/ipfs/';

export const IPFS_GATEWAY_4EVERLAND = 'https://4everland.io/ipfs/';

export const IPFS_FLEEK = 'https://ipfs.fleek.co/ipfs/';

export enum SUPPORTED_NFT_NETWORKS {
  karura = 'karura',
  acala = 'acala',
  kusama = 'kusama',
  statemine = 'statemine',
  unique_network = 'unique_network',
  quartz = 'quartz',
  bitcountry = 'bitcountry',
  pioneer = 'pioneer'
  // TODO: refactor this
  // moonbeam = 'moonbeam',
  // moonriver = 'moonriver',
  // moonbase = 'moonbase',
  // astarEvm = 'astarEvm'
}

export enum SUPPORTED_TRANSFER_EVM_CHAIN_NAME {
  moonbeam = 'moonbeam',
  moonbase = 'moonbase',
  astarEvm = 'astarEvm',
  moonriver = 'moonriver',
  shiden = 'shiden',
  shibuya = 'shibuya'
}

export const SUPPORTED_TRANSFER_EVM_CHAIN = [
  SUPPORTED_TRANSFER_EVM_CHAIN_NAME.moonbase as string,
  SUPPORTED_TRANSFER_EVM_CHAIN_NAME.moonbeam as string,
  SUPPORTED_TRANSFER_EVM_CHAIN_NAME.moonriver as string,
  SUPPORTED_TRANSFER_EVM_CHAIN_NAME.astarEvm as string,
  SUPPORTED_TRANSFER_EVM_CHAIN_NAME.shiden as string,
  SUPPORTED_TRANSFER_EVM_CHAIN_NAME.shibuya as string
];

export const TRANSFER_CHAIN_ID = {
  [SUPPORTED_TRANSFER_EVM_CHAIN_NAME.moonbase as string]: 1287,
  [SUPPORTED_TRANSFER_EVM_CHAIN_NAME.moonbeam as string]: 1284,
  [SUPPORTED_TRANSFER_EVM_CHAIN_NAME.moonriver as string]: 1285,
  [SUPPORTED_TRANSFER_EVM_CHAIN_NAME.astarEvm as string]: 592,
  [SUPPORTED_TRANSFER_EVM_CHAIN_NAME.shiden as string]: 336,
  [SUPPORTED_TRANSFER_EVM_CHAIN_NAME.shibuya as string]: 81
};

export enum SUPPORTED_TRANSFER_SUBSTRATE_CHAIN_NAME {
  statemine = 'statemine',
  acala = 'acala',
  karura = 'karura',
  kusama = 'kusama',
  uniqueNft = 'unique_network',
  quartz = 'quartz',
  opal = 'opal',
  statemint = 'statemint',
  bitcountry = 'bitcountry',
  pioneer = 'pioneer'
}

const RANDOM_IPFS_GATEWAY_SETTING = [
  {
    provider: CF_IPFS_GATEWAY,
    weight: 4
  },
  {
    provider: CLOUDFLARE_PINATA_SERVER,
    weight: 10
  },
  {
    provider: PINATA_IPFS_GATEWAY,
    weight: 1 // Rate limit too low
  },
  {
    provider: DWEB_LINK,
    weight: 5
  },
  {
    provider: GATEWAY_IPFS_IO,
    weight: 5
  },
  {
    provider: IPFS_IO,
    weight: 5
  },
  {
    provider: NFT_STORAGE_GATEWAY,
    weight: 50
  }
];

if (!RuntimeInfo.protocol || (RuntimeInfo.protocol && !RuntimeInfo.protocol.startsWith('http'))) {
  RANDOM_IPFS_GATEWAY_SETTING.push({
    provider: IPFS_FLEEK,
    weight: 4
  });
  RANDOM_IPFS_GATEWAY_SETTING.push({
    provider: IPFS_GATEWAY_4EVERLAND,
    weight: 2
  });
  RANDOM_IPFS_GATEWAY_SETTING.push({
    provider: IPFS_W3S_LINK,
    weight: 1
  });
}

const RANDOM_IPFS_GATEWAY_TOTAL_WEIGHT = RANDOM_IPFS_GATEWAY_SETTING.reduce((value, item) => value + item.weight, 0);

export function getRandomIpfsGateway (): string {
  const weighedItems = [];
  let currentItem = 0;

  while (currentItem < RANDOM_IPFS_GATEWAY_SETTING.length) {
    for (let i = 0; i < RANDOM_IPFS_GATEWAY_SETTING[currentItem].weight; i++) {
      weighedItems[weighedItems.length] = RANDOM_IPFS_GATEWAY_SETTING[currentItem].provider;
    }

    currentItem++;
  }

  return weighedItems[Math.floor(Math.random() * RANDOM_IPFS_GATEWAY_TOTAL_WEIGHT)];
}
