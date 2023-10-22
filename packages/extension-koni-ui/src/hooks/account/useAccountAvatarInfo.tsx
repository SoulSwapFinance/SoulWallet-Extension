// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import useAccountRecoded from '@subwallet/extension-koni-ui/hooks/account/useAccountRecoded';
import { useMemo } from 'react';

import { KeypairType } from '@polkadot/util-crypto/types';

interface Result {
  address: string;
  prefix: number;
}

const useAccountAvatarInfo = (address: string, preventPrefix?: boolean, genesisHash?: string | null, givenType: KeypairType = 'sr25519'): Result => {
  const { formatted, originGenesisHash, prefix } = useAccountRecoded(address || '', genesisHash, givenType);

  const avatarAddress = useMemo((): string => {
    if (originGenesisHash) {
      return formatted || '';
    } else {
      return (preventPrefix ? address : formatted) || '';
    }
  }, [address, formatted, originGenesisHash, preventPrefix]);

  const avatarIdentPrefix = useMemo((): number | undefined => {
    if (originGenesisHash) {
      return prefix;
    } else {
      return !preventPrefix ? prefix : undefined;
    }
  }, [originGenesisHash, prefix, preventPrefix]);

  return useMemo(() => ({
    address: avatarAddress ?? '',
    prefix: avatarIdentPrefix ?? 42
  }), [avatarAddress, avatarIdentPrefix]);
};

export default useAccountAvatarInfo;
