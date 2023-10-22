// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TransactionFormBaseProps } from '@subwallet/extension-koni-ui/types';
import React, { Dispatch, SetStateAction } from 'react';

export interface TransactionContextProps{
  defaultData: TransactionFormBaseProps;
  persistData: (value: TransactionFormBaseProps) => void;
  needPersistData: boolean;
  onDone: (extrinsicHash: string) => void;
  onClickRightBtn: () => void;
  setShowRightBtn: Dispatch<SetStateAction<boolean>>;
  setDisabledRightBtn: Dispatch<SetStateAction<boolean>>;
}

export const TransactionContext = React.createContext<TransactionContextProps>({
  defaultData: { from: '', chain: '', asset: '' },
  needPersistData: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  persistData: (value) => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onDone: (extrinsicHash) => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onClickRightBtn: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setShowRightBtn: (value) => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDisabledRightBtn: (value) => {}
});
