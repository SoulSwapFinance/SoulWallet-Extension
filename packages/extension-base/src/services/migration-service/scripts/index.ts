// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import DeleteChain from '@soul-wallet/extension-base/services/migration-service/scripts/DeleteChain';

import BaseMigrationJob from '../Base';
import AutoEnableChainsTokens from './AutoEnableChainsTokens';
import EnableVaraChain from './EnableVaraChain';
import MigrateAuthUrls from './MigrateAuthUrls';
import MigrateAutoLock from './MigrateAutoLock';
import MigrateChainPatrol from './MigrateChainPatrol';
import MigrateEthProvider from './MigrateEthProvider';
import MigrateImportedToken from './MigrateImportedToken';
import MigrateLedgerAccount from './MigrateLedgerAccount';
import MigrateNetworkSettings from './MigrateNetworkSettings';
import MigratePioneerProvider from './MigratePioneerProvider';
import MigrateSettings from './MigrateSettings';
import MigrateTokenDecimals from './MigrateTokenDecimals';
import MigrateTransactionHistory from './MigrateTransactionHistory';
import MigrateWalletReference from './MigrateWalletReference';

export const EVERYTIME = '__everytime__';

export default <Record<string, typeof BaseMigrationJob>> {
  '1.0.1-11': MigrateNetworkSettings,
  '1.0.1-20': MigrateImportedToken,
  '1.0.1-30': MigrateTransactionHistory,
  '1.0.1-40': AutoEnableChainsTokens,
  '1.0.1-50': MigrateSettings,
  '1.0.1-60': MigrateAuthUrls,
  '1.0.3-01': MigrateAutoLock,
  '1.0.3-02': MigrateChainPatrol,
  '1.0.9-01': MigrateLedgerAccount,
  '1.0.12-02': MigrateEthProvider,
  '1.1.6-01': MigrateWalletReference,
  '1.1.7': DeleteChain,
  '1.1.13-01': MigrateTokenDecimals,
  '1.1.17-01': MigratePioneerProvider,
  '1.1.17-03': EnableVaraChain
  // [`${EVERYTIME}-1`]: AutoEnableChainsTokens
};
