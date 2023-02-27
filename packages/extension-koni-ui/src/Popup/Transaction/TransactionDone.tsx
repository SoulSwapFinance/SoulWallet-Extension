// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import TransactionContent from '@subwallet/extension-koni-ui/Popup/Transaction/parts/TransactionContent';
import TransactionFooter from '@subwallet/extension-koni-ui/Popup/Transaction/parts/TransactionFooter';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button } from '@subwallet/react-ui';
import PageIcon from '@subwallet/react-ui/es/page-icon';
import { CheckCircle } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

type Props = ThemeProps

// Todo: move this to utils and reuse in extension-base/src/services/transaction-service/index.ts
function getTransactionLink (chainInfo: _ChainInfo | undefined, extrinsicHash: string, chainType: 'ethereum' | 'substrate'): string | undefined {
  if (!chainInfo) {
    return undefined;
  }

  if (chainType === 'ethereum') {
    const explorerLink = chainInfo?.evmInfo?.blockExplorer;

    if (explorerLink) {
      return (`${explorerLink}${explorerLink.endsWith('/') ? '' : '/'}tx/${extrinsicHash}`);
    }
  } else {
    const explorerLink = chainInfo?.substrateInfo?.blockExplorer;

    if (explorerLink) {
      return (`${explorerLink}${explorerLink.endsWith('/') ? '' : '/'}extrinsic/${extrinsicHash}`);
    }
  }

  return undefined;
}

const Component: React.FC<Props> = (props: Props) => {
  const { className } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { chain, chainType, extrinsicHash } = useParams<{chain: string, extrinsicHash: string, chainType: 'ethereum' | 'substrate'}>();
  const chainInfoMap = useSelector((root: RootState) => root.chainStore.chainInfoMap);
  const transactionLink = useMemo(
    () => getTransactionLink(chainInfoMap[chain || ''], extrinsicHash || '', chainType || 'substrate'),
    [chain, chainInfoMap, chainType, extrinsicHash]);

  const viewInExplorer = useCallback(
    () => {
      window.open(transactionLink);
    },
    [transactionLink]
  );

  const goHome = useCallback(
    () => {
      navigate('/home/tokens');
    },
    [navigate]
  );

  return (
    <>
      <TransactionContent>
        <div className={className}>
          <div className='page-icon'>
            <PageIcon
              color='var(--page-icon-color)'
              iconProps={{
                weight: 'fill',
                phosphorIcon: CheckCircle
              }}
            />
          </div>
          <div className='title'>
            {t('You’re all done!')}
          </div>
          <div className='description'>
            {t('Your request has been sent. You can track its progress on the Transaction History page.')}
          </div>
        </div>
      </TransactionContent>
      <TransactionFooter errors={[]}>
        <Button
          block={true}
          className={'full-width'}
          onClick={viewInExplorer}
          schema='secondary'
        >
          {t('View transaction')}
        </Button>
        <Button
          block={true}
          className={'full-width'}
          onClick={goHome}
        >
          {t('Back to home')}
        </Button>
      </TransactionFooter>
    </>
  );
};

const TransactionDone = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    padding: `0 ${token.padding}px`,
    textAlign: 'center',

    '.page-icon': {
      display: 'flex',
      justifyContent: 'center',
      marginTop: token.margin,
      marginBottom: token.margin,
      '--page-icon-color': token.colorSecondary
    },

    '.title': {
      marginTop: token.margin,
      marginBottom: token.margin,
      fontWeight: token.fontWeightStrong,
      fontSize: token.fontSizeHeading3,
      lineHeight: token.lineHeightHeading3,
      color: token.colorTextBase
    },

    '.description': {
      padding: `0 ${token.controlHeightLG - token.padding}px`,
      marginTop: token.margin,
      marginBottom: token.margin * 2,
      fontSize: token.fontSizeHeading5,
      lineHeight: token.lineHeightHeading5,
      color: token.colorTextDescription,
      textAlign: 'center'
    },

    '.and-more': {
      fontSize: token.fontSizeHeading5,
      lineHeight: token.lineHeightHeading5,
      color: token.colorTextDescription,

      '.highlight': {
        color: token.colorTextBase
      }
    }
  };
});

export default TransactionDone;
