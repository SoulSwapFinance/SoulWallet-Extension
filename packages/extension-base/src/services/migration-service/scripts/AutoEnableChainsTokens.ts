// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BaseMigrationJob from '@subwallet/extension-base/services/migration-service/Base';
import { keyring } from '@subwallet/ui-keyring';

export default class AutoEnableChainsTokens extends BaseMigrationJob {
  public override async run (): Promise<void> {
    const accounts = keyring.getAccounts();

    await this.state.autoEnableChains(accounts.map(({ address }) => address));
  }
}
