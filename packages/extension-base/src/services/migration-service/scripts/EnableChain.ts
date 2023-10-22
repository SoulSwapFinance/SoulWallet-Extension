// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BaseMigrationJob from 'services/migration-service/Base';

export default abstract class EnableChain extends BaseMigrationJob {
  abstract slug: string;

  public override async run (): Promise<void> {
    const state = this.state;

    await state.enableChain(this.slug, true);
  }
}
