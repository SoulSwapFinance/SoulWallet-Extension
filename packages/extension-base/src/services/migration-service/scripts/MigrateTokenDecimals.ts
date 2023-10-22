// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _isCustomAsset } from 'services/chain-service/utils';
import BaseMigrationJob from 'services/migration-service/Base';

export default class MigrateTokenDecimals extends BaseMigrationJob {
  public override async run (): Promise<void> {
    const state = this.state;

    return new Promise((resolve) => {
      const assetMap = state.getAssetRegistry();

      for (const [slug, info] of Object.entries(assetMap)) {
        if (_isCustomAsset(slug)) {
          state.chainService.upsertCustomToken({
            ...info,
            decimals: info.decimals ? parseInt(info.decimals.toString()) : info.decimals
          });
        }
      }

      resolve();
    });
  }
}
