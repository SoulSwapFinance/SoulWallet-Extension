// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import State from '@soul-wallet/extension-base/koni/background/handlers/State';

import { logger as createLogger } from '@polkadot/util';
import { Logger } from '@polkadot/util/types';

export default class BaseMigrationJob {
  readonly state: State;
  public logger: Logger;

  constructor (state: State) {
    this.state = state;
    this.logger = createLogger(this.constructor.name);
  }

  public run (): Promise<void> {
    return Promise.resolve(console.warn('Need to override function run from base.'));
  }
}
