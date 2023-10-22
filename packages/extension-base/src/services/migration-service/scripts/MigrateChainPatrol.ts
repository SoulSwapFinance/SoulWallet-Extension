// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BaseMigrationJob from 'services/migration-service/Base';
import { DEFAULT_CHAIN_PATROL_ENABLE } from 'services/setting-service/constants';

export default class MigrateChainPatrol extends BaseMigrationJob {
  public override async run (): Promise<void> {
    try {
      return new Promise((resolve) => {
        this.state.settingService.getSettings((currentSettings) => {
          this.state.settingService.setSettings({
            ...currentSettings,
            enableChainPatrol: DEFAULT_CHAIN_PATROL_ENABLE
          });

          resolve();
        });
      });
    } catch (e) {
      console.error(e);
    }
  }
}
