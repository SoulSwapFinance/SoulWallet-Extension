// Copyright 2023 @soul-wallet/web-runner authors & contributors
// SPDX-License-Identifier: Apache-2.0

import '@soul-wallet/extension-inject/crossenv';

import { state as koniState } from '@soul-wallet/extension-base/koni/background/handlers';
import { AccountsStore } from '@soul-wallet/extension-base/stores';
import KeyringStore from '@soul-wallet/extension-base/stores/Keyring';
import keyring from '@subwallet/ui-keyring';

import { cryptoWaitReady } from '@polkadot/util-crypto';

import { PageStatus, responseMessage, setupHandlers } from './messageHandle';

responseMessage({ id: '0', response: { status: 'load' } } as PageStatus);

setupHandlers();

// initial setup
cryptoWaitReady()
  .then((): void => {
    console.log('[Mobile] crypto initialized');

    // load all the keyring data
    keyring.loadAll({ store: new AccountsStore(), type: 'sr25519', password_store: new KeyringStore() });

    keyring.restoreKeyringPassword().finally(() => {
      koniState.updateKeyringState();
    });
    koniState.eventService.emit('crypto.ready', true);

    responseMessage({ id: '0', response: { status: 'crypto_ready' } } as PageStatus);

    // wake web-runner up
    koniState.wakeup().catch((err) => console.warn(err));

    console.log('[Mobile] initialization completed');
  })
  .catch((error): void => {
    console.error('[Mobile] initialization failed', error);
  });
