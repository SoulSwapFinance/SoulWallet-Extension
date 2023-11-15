// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { resolveAddressToDomain, SupportedChainId } from '@azns/resolver-core';

jest.setTimeout(50000);

describe('test domain', () => {
  test('test ens', async () => {
    const primaryDomains = await resolveAddressToDomain(
      '5GgzS1G34d2wRxtVBnSkA8GQBj4ySnGqQb34ix2ULwVzKdWQ',
      {
        chainId: SupportedChainId.AlephZeroTestnet
      }
    );

    console.log(primaryDomains);
  });
});
