// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { WordItem } from '@soul-wallet/extension-koni-ui/types/account';

export const convertToWords = (seedPhrase: string): Array<WordItem> => {
  const raw = seedPhrase.split(' ');
  const result: Array<WordItem> = [];

  raw.forEach((item, index) => {
    result.push({ index: index + 1, label: item });
  });

  return result;
};
