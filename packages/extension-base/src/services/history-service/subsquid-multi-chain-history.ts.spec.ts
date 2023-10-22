// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TransactionHistoryItem } from 'background/KoniTypes';
import { fetchMultiChainHistories } from 'services/history-service/subsquid-multi-chain-history';
import { TEST_CHAIN_MAP } from 'services/history-service/testChainMap';

jest.setTimeout(50000);

describe('TestFetchMultiChainHistories', () => {
  let fetchingRs: TransactionHistoryItem[];

  beforeAll(async () => {
    fetchingRs = await fetchMultiChainHistories(['0x25B12Fe4D6D7ACca1B4035b26b18B4602cA8b10F'], TEST_CHAIN_MAP, 10);
  });

  // Create Unit Test for QueryInput
  it('Fetching data', () => {
    expect(fetchingRs.length).toBeGreaterThan(-1);
    console.log(fetchingRs.length);
  });
});
