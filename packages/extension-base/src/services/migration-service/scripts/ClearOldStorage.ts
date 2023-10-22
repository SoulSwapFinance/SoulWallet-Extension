// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BaseMigrationJob from '@subwallet/extension-base/services/migration-service/Base';

export default class ClearOldStorage extends BaseMigrationJob {
  public override async run (): Promise<void> {
    // Clear all old storage data
    await chrome.storage.local.clear();

    return Promise.resolve();
  }
}
