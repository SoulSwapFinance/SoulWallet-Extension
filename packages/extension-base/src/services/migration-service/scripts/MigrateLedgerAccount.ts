// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BaseMigrationJob from 'services/migration-service/Base';
import { AccountsStore } from 'stores';
import { KeyringJson } from '@subwallet/ui-keyring/types';

import { isString } from '@polkadot/util';

export default class MigrateLedgerAccount extends BaseMigrationJob {
  public override async run (): Promise<void> {
    try {
      return new Promise((resolve) => {
        const store = new AccountsStore();

        const update = (key: string, value: KeyringJson) => {
          if (key.startsWith('account:') && value.meta && isString(value.meta?.originGenesisHash)) {
            const newValue = { ...value };

            newValue.meta.availableGenesisHashes = [value.meta.originGenesisHash];
            store.set(key, newValue);
          }
        };

        store.allMap((map: Record<string, KeyringJson>) => {
          Object.entries(map).forEach(([key, value]): void => {
            update(key, value);
          });

          resolve();
        });
      });
    } catch (e) {
      console.error(e);
    }
  }
}
