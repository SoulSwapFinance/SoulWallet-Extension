// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { MetadataStore } from 'stores';
import { addMetadata } from '@soul-wallet/extension-chains';
import { MetadataDef } from '@soul-wallet/extension-inject/src/types';

import { knownGenesis } from '@polkadot/networks/defaults';
import { HexString } from '@polkadot/util/types';

export const extractMetadata = (store: MetadataStore): void => {
  store.allMap((map): void => {
    const knownEntries = Object.entries(knownGenesis);
    const defs: Record<string, { def: MetadataDef, index: number, key: string }> = {};
    const removals: string[] = [];

    Object
      .entries(map)
      .forEach(([key, def]): void => {
        const entry = knownEntries.find(([, hashes]) => hashes.includes(def.genesisHash as HexString));

        if (entry) {
          const [name, hashes] = entry;
          const index = hashes.indexOf(def.genesisHash as HexString);

          // flatten the known metadata based on the genesis index
          // (lower is better/newer)
          if (!defs[name] || (defs[name].index > index)) {
            if (defs[name]) {
              // remove the old version of the metadata
              removals.push(defs[name].key);
            }

            defs[name] = { def, index, key };
          }
        } else {
          // this is not a known entry, so we will just apply it
          defs[key] = { def, index: 0, key };
        }
      });

    removals.forEach((key) => store.remove(key));
    Object.values(defs).forEach(({ def }) => addMetadata(def));
  });
};
