// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CURRENT_PAGE } from '@subwallet/extension-koni-ui/constants';
import { DEFAULT_ROUTER_PATH } from '@subwallet/extension-koni-ui/constants/router';
import { RouteState } from '@subwallet/extension-koni-ui/Popup/Root';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from 'usehooks-ts';

export default function useDefaultNavigate () {
  const navigate = useNavigate();
  const [, setStorage] = useLocalStorage<string>(CURRENT_PAGE, '/');

  const goHome = useCallback(
    () => {
      navigate(DEFAULT_ROUTER_PATH);
      setStorage('/home/tokens');
    },
    [navigate, setStorage]
  );

  const goBack = useCallback(
    () => {
      navigate(RouteState.prevDifferentPathNum);
    },
    [navigate]
  );

  return {
    goHome,
    goBack
  };
}
