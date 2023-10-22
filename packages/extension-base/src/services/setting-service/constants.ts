// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BrowserConfirmationType, LanguageType, ThemeNames, UiSettings, WalletUnlockType } from '@soul-wallet/extension-base/src/background/KoniTypes';
import { TARGET_ENV } from '@soul-wallet/extension-base/src/utils';

export const DEFAULT_THEME: ThemeNames = ThemeNames.DARK;
export const DEFAULT_NOTIFICATION_TYPE: BrowserConfirmationType = 'popup';
export const DEFAULT_AUTO_LOCK_TIME = 15;
export const DEFAULT_UNLOCK_TYPE: WalletUnlockType = TARGET_ENV === 'extension' ? WalletUnlockType.ALWAYS_REQUIRED : WalletUnlockType.WHEN_NEEDED;
export const DEFAULT_CHAIN_PATROL_ENABLE = false;
export const DEFAULT_LANGUAGE: LanguageType = 'en';
export const DEFAULT_SHOW_ZERO_BALANCE = true;
export const DEFAULT_SHOW_BALANCE = false;
export const DEFAULT_ALL_LOGO = '';
export const DEFAULT_CAMERA_ENABLE = false;

export const DEFAULT_SETTING: UiSettings = {
  language: DEFAULT_LANGUAGE,
  browserConfirmationType: DEFAULT_NOTIFICATION_TYPE,
  isShowZeroBalance: DEFAULT_SHOW_ZERO_BALANCE,
  isShowBalance: DEFAULT_SHOW_BALANCE,
  accountAllLogo: DEFAULT_ALL_LOGO,
  theme: DEFAULT_THEME,
  unlockType: DEFAULT_UNLOCK_TYPE,
  camera: DEFAULT_CAMERA_ENABLE,
  timeAutoLock: DEFAULT_AUTO_LOCK_TIME,
  enableChainPatrol: DEFAULT_CHAIN_PATROL_ENABLE,
  walletReference: ''
};
