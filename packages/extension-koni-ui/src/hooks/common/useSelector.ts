// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RootState } from '@soul-wallet/extension-koni-ui/stores';
import { TypedUseSelectorHook, useSelector as useReduxSelector } from 'react-redux';

export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector;
