// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BaseMigrationJob from '@soul-wallet/extension-base/services/migration-service/Base';
import { DEFAULT_AUTO_LOCK_TIME } from '@soul-wallet/extension-base/services/setting-service/constants';

export default class MigrateAutoLock extends BaseMigrationJob {
  public override async run (): Promise<void> {
    try {
      return new Promise((resolve) => {
        this.state.settingService.getSettings((currentSettings) => {
          this.state.settingService.setSettings({
            ...currentSettings,
            timeAutoLock: DEFAULT_AUTO_LOCK_TIME
          });

          resolve();
        });
      });
    } catch (e) {
      console.error(e);
    }
  }
}
