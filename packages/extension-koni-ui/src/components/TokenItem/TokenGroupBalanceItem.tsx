// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { useSelector } from '@soul-wallet/extension-koni-ui/hooks';
import { ThemeProps } from '@soul-wallet/extension-koni-ui/types';
import { TokenBalanceItemType } from '@soul-wallet/extension-koni-ui/types/balance';
import { ActivityIndicator, BalanceItem, BalanceItemProps, Icon, Number } from '@subwallet/react-ui';
import classNames from 'classnames';
import { CaretRight } from 'phosphor-react';
import React from 'react';
import styled from 'styled-components';

type Props = TokenBalanceItemType & ThemeProps & {
  onPressItem?: BalanceItemProps['onPressItem'],
};

function Component (
  { className = '',
    isReady,
    logoKey,
    onPressItem,
    priceChangeStatus,
    priceValue,
    slug,
    symbol,
    total }: Props) {
  // todo: Update BalanceItem in react-ui lib
  // - loading
  // - auto detect logo, only use logoKey
  // - price change status

  const { isShowBalance } = useSelector((state) => state.settings);

  return (
    <div className={classNames('token-group-balance-item', className, {
      '-price-decrease': priceChangeStatus === 'decrease'
    })}
    >
      <BalanceItem
        balanceValue={total.value}
        convertedBalanceValue={total.convertedValue}
        decimal={0}
        displayToken={symbol}
        name={symbol}
        networkMainLogoShape={'squircle'}
        onPressItem={onPressItem}
        price={priceValue}
        rightItem={
          (
            <>
              <div className={'ant-balance-item-balance-info-wrapper'}>
                <Number
                  className={'__value'}
                  decimal={0}
                  decimalOpacity={0.45}
                  hide={!isShowBalance}
                  value={total.value}
                />
                <Number
                  className={'__converted-value'}
                  decimal={0}
                  decimalOpacity={0.45}
                  hide={!isShowBalance}
                  intOpacity={0.45}
                  prefix='$'
                  size={12}
                  unitOpacity={0.45}
                  value={total.convertedValue}
                />
              </div>

              <div className={'__icon-wrapper'}>
                {isReady
                  ? (
                    <Icon
                      phosphorIcon={CaretRight}
                      size='sm'
                      type='phosphor'
                    />
                  )
                  : (
                    <ActivityIndicator
                      prefixCls={'ant'} // todo: add className to ActivityIndicator
                      size={20}
                    />
                  )}
              </div>
            </>
          )
        }
        symbol={logoKey}
      />
    </div>
  );
}

export const TokenGroupBalanceItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-web3-block': {
      padding: 12
    },

    '.ant-number .ant-typography': {
      fontSize: 'inherit !important',
      lineHeight: 'inherit'
    },

    '.__value': {
      lineHeight: token.lineHeightLG,
      fontSize: token.fontSizeLG
    },

    '.__converted-value': {
      lineHeight: token.lineHeightSM,
      fontSize: token.fontSizeSM
    },

    '.ant-web3-block-middle-item': {
      '.ant-number': {
        fontSize: token.fontSizeSM,
        lineHeight: token.lineHeightSM
      }
    },

    '&.-price-decrease .ant-web3-block-middle-item': {
      '.ant-number .ant-typography': {
        color: `${token.colorError} !important`
      }
    },

    '.ant-loading-icon': {
      color: 'inherit !important'
    },

    '.ant-image-img': {
      height: 'auto !important'
    },
    '.__icon-wrapper': {
      width: 40,
      display: 'flex',
      justifyContent: 'center',
      color: token.colorTextLight4
    },
    '.ant-balance-item-content:hover': {
      '.__icon-wrapper': {
        color: token.colorTextLight2
      }
    }
  });
});
