// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const uniqueStringArray = (array: string[]): string[] => {
  const map: Record<string, string> = {};

  array.forEach((v) => {
    map[v] = v;
  });

  return Object.keys(map);
};
