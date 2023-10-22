// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { state } from '@subwallet/extension-base/koni/background/handlers';

export const onExtensionInstall = () => {
  state.onInstall();
};
