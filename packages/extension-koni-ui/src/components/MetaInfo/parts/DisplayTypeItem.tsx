// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import CN from 'classnames';
import React from 'react';
import styled from 'styled-components';

import { InfoItemBase } from './types';

export interface DisplayTypeInfoItem extends Omit<InfoItemBase, 'valueColorSchema'> {
  typeName: string
}

const Component: React.FC<DisplayTypeInfoItem> = (props: DisplayTypeInfoItem) => {
  const { className, label, typeName } = props;

  return (
    <div className={CN(className, '__row -type-display-type')}>
      <div className={'__col'}>
        <div className={'__label'}>
          {label}
        </div>
      </div>
      <div className={'__col -to-right'}>
        <div className={'__type-name __value'}>
          {typeName}
        </div>
      </div>
    </div>
  );
};

const DisplayTypeItem = styled(Component)<DisplayTypeInfoItem>(({ theme: { token } }: DisplayTypeInfoItem) => {
  return {};
});

export default DisplayTypeItem;
