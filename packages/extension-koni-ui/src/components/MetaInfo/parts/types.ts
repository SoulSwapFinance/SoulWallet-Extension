// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ThemeProps } from '@soul-wallet/extension-koni-ui/types';
import React from 'react';

export interface InfoItemBase extends ThemeProps {
  label?: React.ReactNode,
  valueColorSchema?: 'default' | 'light' | 'gray' | 'success' | 'gold' | 'danger' | 'warning'
}
