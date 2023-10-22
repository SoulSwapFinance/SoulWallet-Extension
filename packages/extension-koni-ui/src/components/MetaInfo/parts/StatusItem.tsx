// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Icon, SwIconProps } from '@subwallet/react-ui';
import CN from 'classnames';
import React from 'react';
import styled from 'styled-components';

import { InfoItemBase } from './types';

export interface StatusInfoItem extends InfoItemBase {
  statusIcon: SwIconProps['phosphorIcon'],
  statusName: string,
}

const Component: React.FC<StatusInfoItem> = (props: StatusInfoItem) => {
  const { className, label, statusIcon, statusName, valueColorSchema = 'default' } = props;

  return (
    <div className={CN(className, '__row', '-type-status')}>
      <div className={'__col'}>
        <div className={'__label'}>
          {label}
        </div>
      </div>
      <div className={'__col -to-right'}>
        <div className={`__status-item __value -is-wrapper -schema-${valueColorSchema}`}>
          <Icon
            className={'__status-icon'}
            phosphorIcon={statusIcon}
            size={'sm'}
            weight={'fill'}
          />
          <div className={'__status-name ml-xxs'}>
            {statusName}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusItem = styled(Component)<StatusInfoItem>(({ theme: { token } }: StatusInfoItem) => {
  return {};
});

export default StatusItem;
