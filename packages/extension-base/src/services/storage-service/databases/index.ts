// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@soul-wallet/chain-list/types';
import { BalanceItem, ChainStakingMetadata, CrowdloanItem, MetadataItem, NftCollection, NftItem, NominatorMetadata, PriceJson, StakingItem, TransactionHistoryItem } from '@soul-wallet/extension-base/background/KoniTypes';
import Dexie, { Table, Transaction } from 'dexie';

const DEFAULT_DATABASE = 'SubWalletDB_v2';

export interface DefaultChainDoc {
  chain: string
}

export interface DefaultAddressDoc {
  address: string
}

export interface DefaultDocWithAddressAndChain extends DefaultChainDoc, DefaultAddressDoc {}

export interface IBalance extends BalanceItem, DefaultAddressDoc {}
export interface IChain extends _ChainInfo {
  active: boolean,
  currentProvider: string
}
export interface ICrowdloanItem extends CrowdloanItem, DefaultAddressDoc, DefaultChainDoc {}
export interface INft extends NftItem, DefaultAddressDoc {}
export interface ITransactionHistoryItem extends TransactionHistoryItem, DefaultAddressDoc, DefaultChainDoc {}

// TODO: refactor this
export interface IMigration {
  key: string,
  name: string,
  timestamp: number
}

export interface IMetadataItem extends MetadataItem, DefaultChainDoc {}

export type IMantaPayLedger = any;

export default class KoniDatabase extends Dexie {
  public price!: Table<PriceJson, object>;
  public balances!: Table<IBalance, object>;

  public nfts!: Table<INft, object>;
  public nftCollections!: Table<NftCollection, object>;
  public crowdloans!: Table<ICrowdloanItem, object>;
  public stakings!: Table<StakingItem, object>;
  public transactions!: Table<ITransactionHistoryItem, object>;
  public migrations!: Table<IMigration, object>;

  public metadata!: Table<IMetadataItem, object>;
  public chain!: Table<IChain, object>;
  public asset!: Table<_ChainAsset, object>;

  public chainStakingMetadata!: Table<ChainStakingMetadata, object>;
  public nominatorMetadata!: Table<NominatorMetadata, object>;

  public mantaPay!: Table<IMantaPayLedger, object>;

  private schemaVersion: number;

  public constructor (name = DEFAULT_DATABASE, schemaVersion = 11) {
    super(name);
    this.schemaVersion = schemaVersion;

    this.conditionalVersion(1, {
      // DO NOT declare all columns, only declare properties to be indexed
      // Read more: https://dexie.org/docs/Version/Version.stores()
      // Primary key is always the first entry
      chain: 'slug',
      asset: 'slug',
      price: 'currency',
      balances: '[tokenSlug+address], tokenSlug, address',
      nfts: '[chain+address+collectionId+id], [address+chain], chain, id, address, collectionId, name',
      nftCollections: '[chain+collectionId], chain, collectionId, collectionName',
      crowdloans: '[chain+address], chain, address',
      stakings: '[chain+address+type], [chain+address], chain, address, type',
      transactions: '[chain+address+extrinsicHash], &[chain+address+extrinsicHash], chain, address, extrinsicHash, action',
      migrations: '[key+name]',

      chainStakingMetadata: '[chain+type], chain, type',
      nominatorMetadata: '[chain+address+type], [chain+address], chain, address, type'
    });

    this.conditionalVersion(2, {
      metadata: 'genesisHash, chain'
    });

    this.conditionalVersion(3, {
      mantaPay: 'key, chain'
    });
  }

  private conditionalVersion (
    version: number,
    schema: { [key: string]: string | null },
    upgrade?: (t: Transaction) => Promise<void>
  ) {
    if (this.schemaVersion != null && this.schemaVersion < version) {
      return;
    }

    const dexieVersion = this.version(version).stores(schema);

    if (upgrade != null) {
      dexieVersion.upgrade(upgrade);
    }
  }
}
