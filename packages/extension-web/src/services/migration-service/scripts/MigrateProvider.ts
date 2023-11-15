// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BaseMigrationJob from '@soul-wallet/extension-base/services/migration-service/Base';

export default abstract class MigrateProvider extends BaseMigrationJob {
  abstract slug: string;
  abstract oldProvider: string;
  abstract newProvider: string;

  public override async run (): Promise<void> {
    const state = this.state;

    const chainState = state.getChainStateByKey(this.slug);
    const chainInfo = state.getChainInfo(this.slug);

    if (chainState.active && chainState.currentProvider === this.oldProvider) {
      await state.upsertChainInfo({
        mode: 'update',
        chainEditInfo: {
          currentProvider: this.newProvider,
          slug: this.slug,
          providers: chainInfo.providers
        }
      });
    }
  }
}
