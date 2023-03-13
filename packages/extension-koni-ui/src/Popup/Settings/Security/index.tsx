// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Layout } from '@subwallet/extension-koni-ui/components';
import PageWrapper from '@subwallet/extension-koni-ui/components/Layout/PageWrapper';
import { PhosphorIcon, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, Icon, SettingItem, Switch } from '@subwallet/react-ui';
import CN from 'classnames';
import { Camera, CaretRight, GlobeHemisphereEast, Key } from 'phosphor-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import settings from '@polkadot/ui-settings';

type Props = ThemeProps;

enum SecurityType {
  WALLET_PASSWORD = 'wallet-password',
  WEBSITE_ACCESS = 'website-access',
  CAMERA_ACCESS = 'camera-access',
}

interface SecurityItem {
  icon: PhosphorIcon;
  key: SecurityType;
  title: string;
  url: string;
}

const items: SecurityItem[] = [
  {
    icon: Key,
    key: SecurityType.WALLET_PASSWORD,
    title: 'Change wallet password',
    url: '/keyring/change-password'
  },
  {
    icon: GlobeHemisphereEast,
    key: SecurityType.WEBSITE_ACCESS,
    title: 'Manage website access',
    url: '/settings/dapp-access'
  }
];

const Component: React.FC<Props> = (props: Props) => {
  const { className } = props;

  const { t } = useTranslation();
  const navigate = useNavigate();

  const [camera, setCamera] = useState(settings.camera === 'on');
  const [loading, setLoading] = useState(false);

  const updateCamera = useCallback((currentValue: boolean) => {
    return () => {
      setLoading(true);
      settings.set({ camera: currentValue ? 'off' : 'on' });
      setTimeout(() => {
        setCamera(settings.camera === 'on');
        setLoading(false);
      }, 300);
    };
  }, []);

  const goBack = useCallback(() => {
    navigate('/settings/list');
  }, [navigate]);

  const onClickItem = useCallback((url: string) => {
    return () => {
      navigate(url);
    };
  }, [navigate]);

  return (
    <PageWrapper className={CN(className)}>
      <Layout.WithSubHeaderOnly
        onBack={goBack}
        title={t('Security settings')}
      >
        <div className='body-container'>
          <div className='items-container'>
            {
              items.map((item) => (
                <SettingItem
                  className={CN('security-item', `security-type-${item.key}`)}
                  key={item.key}
                  leftItemIcon={(
                    <BackgroundIcon
                      backgroundColor={'var(--icon-bg-color)'}
                      phosphorIcon={item.icon}
                      size='sm'
                      type='phosphor'
                      weight='fill'
                    />
                  )}
                  name={t(item.title)}
                  onPressItem={onClickItem(item.url)}
                  rightItem={(
                    <Icon
                      className='security-item-right-icon'
                      phosphorIcon={CaretRight}
                      size='sm'
                      type='phosphor'
                    />
                  )}
                />
              ))
            }
          </div>
          <div className='camera-access-container'>
            <div className='label'>
              {t('Camera access')}
            </div>
            <SettingItem
              className={CN('security-item', `security-type-${SecurityType.CAMERA_ACCESS}`)}
              leftItemIcon={(
                <BackgroundIcon
                  backgroundColor={'var(--icon-bg-color)'}
                  phosphorIcon={Camera}
                  size='sm'
                  type='phosphor'
                  weight='fill'
                />
              )}
              name={t('Allow QR camera access')}
              rightItem={(
                <Switch
                  checked={camera}
                  loading={loading}
                  onClick={updateCamera(camera)}
                />
              )}
            />
          </div>
        </div>
      </Layout.WithSubHeaderOnly>
    </PageWrapper>
  );
};

const SecurityList = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.body-container': {
      padding: `${token.paddingLG}px ${token.padding}px`
    },

    '.items-container': {
      display: 'flex',
      flexDirection: 'column',
      gap: token.sizeXS
    },

    [`.security-type-${SecurityType.WALLET_PASSWORD}`]: {
      '--icon-bg-color': token['geekblue-6'],

      '&:hover': {
        '--icon-bg-color': token['geekblue-7']
      }
    },

    [`.security-type-${SecurityType.WEBSITE_ACCESS}`]: {
      '--icon-bg-color': token['blue-7'],

      '&:hover': {
        '--icon-bg-color': token['blue-8']
      }
    },

    [`.security-type-${SecurityType.CAMERA_ACCESS}`]: {
      '--icon-bg-color': token['green-6'],

      '&:hover': {
        '--icon-bg-color': token['green-7']
      }
    },

    '.security-item': {
      '.ant-web3-block-right-item': {
        marginRight: token.sizeXXS,
        color: token['gray-4']
      },

      '&:hover': {
        '.ant-web3-block-right-item': {
          color: token['gray-6']
        }
      }
    },

    '.camera-access-container': {
      marginTop: token.marginLG,
      display: 'flex',
      flexDirection: 'column',
      gap: token.size,

      '.label': {
        fontWeight: token.fontWeightStrong,
        fontSize: token.fontSizeSM,
        lineHeight: token.lineHeightSM,
        color: token.colorTextLabel,
        textTransform: 'uppercase'
      }
    }
  };
});

export default SecurityList;
