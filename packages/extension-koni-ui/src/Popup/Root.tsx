// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { WalletUnlockType } from '@soul-wallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@soul-wallet/extension-base/constants';
import { isSameAddress } from '@soul-wallet/extension-base/utils';
import { BackgroundExpandView } from '@subwallet/extension-koni-ui/components';
import { Logo2D } from '@subwallet/extension-koni-ui/components/Logo';
import { TRANSACTION_STORAGES } from '@subwallet/extension-koni-ui/constants';
import { DEFAULT_ROUTER_PATH } from '@subwallet/extension-koni-ui/constants/router';
import { DataContext } from '@subwallet/extension-koni-ui/contexts/DataContext';
import { usePredefinedModal, WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContext';
import { useGetCurrentPage, useSubscribeLanguage } from '@subwallet/extension-koni-ui/hooks';
import useNotification from '@subwallet/extension-koni-ui/hooks/common/useNotification';
import useUILock from '@subwallet/extension-koni-ui/hooks/common/useUILock';
import { subscribeNotifications } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { isNoAccount, removeStorage } from '@subwallet/extension-koni-ui/utils';
import { changeHeaderLogo } from '@subwallet/react-ui';
import { NotificationProps } from '@subwallet/react-ui/es/notification/NotificationProvider';
import CN from 'classnames';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';

changeHeaderLogo(<Logo2D />);

export const RouteState = {
  prevDifferentPathNum: -1,
  lastPathName: '/'
};

const welcomeUrl = '/welcome';
const tokenUrl = '/home/tokens';
const loginUrl = '/keyring/login';
const createPasswordUrl = '/keyring/create-password';
const migratePasswordUrl = '/keyring/migrate-password';
const securityUrl = '/settings/security';
const createDoneUrl = '/create-done';

const baseAccountPath = '/accounts';
const allowImportAccountPaths = ['new-seed-phrase', 'import-seed-phrase', 'import-private-key', 'restore-json', 'import-by-qr', 'attach-read-only', 'connect-polkadot-vault', 'connect-keystone', 'connect-ledger'];

const allowImportAccountUrls = allowImportAccountPaths.map((path) => `${baseAccountPath}/${path}`);

export const MainWrapper = styled('div')<ThemeProps>(({ theme: { token } }: ThemeProps) => ({
  display: 'flex',
  height: '100%',
  flexDirection: 'column',
  overflow: 'auto',

  '.web-layout-container': {
    height: '100%'
  }
}));

function removeLoadingPlaceholder (): void {
  const element = document.getElementById('loading-placeholder');

  if (element) {
    // Add transition effect
    element.style.transition = 'opacity 0.3s ease-in-out';
    // Set opacity to 0
    element.style.opacity = '0';

    // Callback after 1 second
    setTimeout(() => {
      // Remove element
      element.parentNode?.removeChild(element);
    }, 300);
  }
}

function DefaultRoute ({ children }: { children: React.ReactNode }): React.ReactElement {
  const dataContext = useContext(DataContext);
  const location = useLocation();
  const { isOpenPModal, openPModal } = usePredefinedModal();
  const notify = useNotification();
  const [rootLoading, setRootLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const initDataRef = useRef<Promise<boolean>>(dataContext.awaitStores(['accountState', 'chainStore', 'assetRegistry', 'requestState', 'settings', 'mantaPay']));
  const currentPage = useGetCurrentPage();
  const firstRender = useRef(true);

  useSubscribeLanguage();

  const { unlockType } = useSelector((state: RootState) => state.settings);
  const { hasConfirmations, hasInternalConfirmations } = useSelector((state: RootState) => state.requestState);
  const { accounts, currentAccount, hasMasterPassword, isLocked } = useSelector((state: RootState) => state.accountState);
  const [initAccount, setInitAccount] = useState(currentAccount);
  const noAccount = useMemo(() => isNoAccount(accounts), [accounts]);
  const { isUILocked } = useUILock();
  const needUnlock = isUILocked || (isLocked && unlockType === WalletUnlockType.ALWAYS_REQUIRED);

  const needMigrate = useMemo(
    () => !!accounts
      .filter((acc) => acc.address !== ALL_ACCOUNT_KEY && !acc.isExternal && !acc.isInjected)
      .filter((acc) => !acc.isMasterPassword)
      .length
    , [accounts]
  );

  useEffect(() => {
    initDataRef.current.then(() => {
      setDataLoaded(true);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    let cancel = false;
    let lastNotifyTime = new Date().getTime();

    subscribeNotifications((rs) => {
      rs.sort((a, b) => a.id - b.id)
        .forEach(({ action, id, message, title, type }) => {
          if (!cancel && id > lastNotifyTime) {
            const notificationItem: NotificationProps = { message: title || message, type };

            if (action?.url) {
              notificationItem.onClick = () => {
                window.open(action.url);
              };
            }

            notify(notificationItem);
            lastNotifyTime = id;
          }
        });
    }).catch(console.error);

    return () => {
      cancel = true;
    };
  }, [notify]);

  // Update goBack number
  useEffect(() => {
    if (location.pathname === RouteState.lastPathName) {
      RouteState.prevDifferentPathNum -= 1;
    } else {
      RouteState.prevDifferentPathNum = -1;
    }

    RouteState.lastPathName = location.pathname;
  }, [location]);

  const redirectPath = useMemo<string | null>(() => {
    const pathName = location.pathname;
    let redirectTarget: string | null = null;

    // Wait until data loaded
    if (!dataLoaded) {
      return null;
    }

    if (needMigrate && hasMasterPassword && !needUnlock) {
      redirectTarget = migratePasswordUrl;
    } else if (hasMasterPassword && needUnlock) {
      redirectTarget = loginUrl;
    } else if (!hasMasterPassword) {
      if (noAccount) {
        if (![...allowImportAccountUrls, welcomeUrl, createPasswordUrl, securityUrl].includes(pathName)) {
          redirectTarget = welcomeUrl;
        }
      } else if (pathName !== createDoneUrl) {
        redirectTarget = createPasswordUrl;
      }
    } else if (noAccount) {
      if (![...allowImportAccountUrls, welcomeUrl, createPasswordUrl, securityUrl].includes(pathName)) {
        redirectTarget = welcomeUrl;
      }
    } else if (pathName === DEFAULT_ROUTER_PATH) {
      if (hasConfirmations) {
        openPModal('confirmations');
      } else if (firstRender.current && currentPage) {
        redirectTarget = currentPage;
      } else {
        redirectTarget = tokenUrl;
      }
    } else if (pathName === loginUrl && !needUnlock) {
      redirectTarget = DEFAULT_ROUTER_PATH;
    } else if (hasInternalConfirmations) {
      openPModal('confirmations');
    } else if (!hasInternalConfirmations && isOpenPModal('confirmations')) {
      openPModal(null);
    }

    // Remove loading on finished first compute
    firstRender.current && setRootLoading((val) => {
      if (val) {
        removeLoadingPlaceholder();
        firstRender.current = false;
      }

      return false;
    });

    if (redirectTarget && redirectTarget !== pathName) {
      return redirectTarget;
    } else {
      return null;
    }
  }, [location.pathname, dataLoaded, needMigrate, hasMasterPassword, needUnlock, noAccount, hasInternalConfirmations, isOpenPModal, hasConfirmations, currentPage, openPModal]);

  // Remove transaction persist state
  useEffect(() => {
    if (!isSameAddress(initAccount?.address || '', currentAccount?.address || '')) {
      for (const key of TRANSACTION_STORAGES) {
        removeStorage(key);
      }

      setInitAccount(currentAccount);
    }
  }, [currentAccount, initAccount]);

  if (rootLoading || redirectPath) {
    return <>{redirectPath && <Navigate to={redirectPath} />}</>;
  } else {
    return <MainWrapper className={CN('main-page-container')}>
      {children}
      <BackgroundExpandView />
    </MainWrapper>;
  }
}

export function Root (): React.ReactElement {
  // Implement WalletModalContext in Root component to make it available for all children and can use react-router-dom and ModalContextProvider

  return (
    <WalletModalContext>
      <DefaultRoute>
        <Outlet />
      </DefaultRoute>
    </WalletModalContext>
  );
}
