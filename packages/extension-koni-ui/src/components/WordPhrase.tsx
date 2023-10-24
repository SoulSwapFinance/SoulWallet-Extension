// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { useCopy } from '@soul-wallet/extension-koni-ui/hooks';
import { ThemeProps, WordItem } from '@soul-wallet/extension-koni-ui/types';
import { convertToWords } from '@soul-wallet/extension-koni-ui/utils';
import { Button, Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { saveAs } from 'file-saver';
import { CopySimple, EyeSlash } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

interface Props extends ThemeProps {
  seedPhrase: string;
  enableDownload?: boolean;
}

const Component: React.FC<Props> = (props: Props) => {
  const { className, enableDownload, seedPhrase } = props;

  const { t } = useTranslation();

  const words: Array<WordItem> = useMemo(() => convertToWords(seedPhrase), [seedPhrase]);

  const onCopy = useCopy(seedPhrase);

  const backupMnemonicSeed = useCallback(() => {
    const blob = new Blob([seedPhrase], { type: 'text/plain' });

    saveAs(blob, 'mnemonic-seed.txt');
  }, [seedPhrase]);

  const onClick = useCallback(() => {
    onCopy();

    if (enableDownload) {
      backupMnemonicSeed();
    }
  }, [backupMnemonicSeed, enableDownload, onCopy]);

  return (
    <div className={CN(className)}>
      <div className='content-container'>
        <div className='word-container'>
          {
            words.map((item) => {
              return (
                <div
                  className='word-item'
                  key={item.label}
                >
                  <div className='word-index'>{item.index}</div>
                  <div className='word-content'>{item.label}</div>
                </div>
              );
            })
          }
        </div>
        <div className='hover-noti'>
          <Icon
            customSize='28px'
            phosphorIcon={EyeSlash}
          />
          <span>{t('Hover to view seed phrase')}</span>
        </div>
      </div>
      <Button
        icon={(
          <Icon phosphorIcon={CopySimple} />
        )}
        onClick={onClick}
        size='xs'
        type='ghost'
      >
        {enableDownload ? t('Copy & Save to the clipboard') : t('Copy to clipboard')}
      </Button>
    </div>
  );
};

const WordPhrase = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: token.size,
    alignItems: 'center',

    '.content-container': {
      width: '100%',
      position: 'relative',

      '&:hover': {
        '.word-container': {
          filter: 'unset'
        },

        '.hover-noti': {
          opacity: 0,
          zIndex: -1,
          transition: 'all 0.3s ease-in-out'
        }
      }
    },

    '.word-container': {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: token.sizeXS,
      width: '100%',
      padding: token.paddingXS,
      borderRadius: token.borderRadiusLG,
      filter: 'blur(4.5px)',
      transition: 'all 0.3s ease-in-out',

      '.word-item': {
        display: 'flex',
        flexDirection: 'row',
        gap: token.sizeXXS / 2,
        alignItems: 'center',
        padding: `${token.paddingSM}px ${token.paddingSM - 2}px`,
        borderRadius: token.borderRadiusLG,
        backgroundColor: token.colorBgInput,
        height: token.controlHeightLG,
        fontSize: token.fontSizeSM,
        lineHeight: token.lineHeightSM,

        '.word-index': {
          color: token.colorTextDescription,
          width: token.sizeMD - 2
        },

        '.word-content': {
          color: token.colorTextBase
        }
      }
    },

    '.hover-noti': {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      transition: 'all 0.3s ease-in-out',
      color: token.colorWhite,
      fontStyle: 'normal',
      fontWeight: 600,
      gap: token.sizeXS,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6
    }
  };
});

export default WordPhrase;
