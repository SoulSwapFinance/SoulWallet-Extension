// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { withErrorLog } from '@soul-wallet/extension-base/src/background/handlers/helpers';
import { BrowserConfirmationType, RequestSettingsType } from '@soul-wallet/extension-base/src/background/KoniTypes';
import RequestService from '@soul-wallet/extension-base/src/services/request-service';
import { DEFAULT_NOTIFICATION_TYPE } from '@soul-wallet/extension-base/src/services/setting-service/constants';
import { getOS } from '@soul-wallet/extension-base/src/utils';

const NOTIFICATION_URL = chrome.extension.getURL('notification.html');

const OS = getOS();

const extraHeight = OS === 'Linux' ? 0 : 28;
const extraWidth = OS === 'Windows' ? 16 : 0;

const POPUP_WINDOW_OPTS: chrome.windows.CreateData = {
  focused: true,
  height: 600 + extraHeight,
  type: 'popup',
  url: NOTIFICATION_URL,
  width: 390 + extraWidth
};

const NORMAL_WINDOW_OPTS: chrome.windows.CreateData = {
  focused: true,
  type: 'normal',
  url: NOTIFICATION_URL
};

export default class PopupHandler {
  readonly #requestService: RequestService;
  #notification: BrowserConfirmationType = DEFAULT_NOTIFICATION_TYPE;
  #windows: number[] = [];

  constructor (requestService: RequestService) {
    this.#requestService = requestService;

    const updateNotification = (rs: RequestSettingsType) => {
      this.#notification = rs.browserConfirmationType;
    };

    requestService.settingService.getSettings(updateNotification);
    requestService.settingService.getSubject().subscribe({
      next: updateNotification
    });
  }

  public updateIconV2 (shouldClose?: boolean): void {
    const numRequests = this.#requestService.numRequests;
    const text = numRequests > 0 ? numRequests.toString() : '';

    withErrorLog(() => chrome.browserAction?.setBadgeText({ text }));

    if (shouldClose && text === '') {
      this.popupClose();
    }
  }

  public get popup () {
    return this.#windows;
  }

  public popupClose (): void {
    this.#windows.forEach((id: number) =>
      withErrorLog(() => chrome.windows.remove(id))
    );
    this.#windows = [];
  }

  public popupOpen (): void {
    if (this.#notification !== 'extension') {
      chrome.windows.getCurrent((win) => {
        const popupOptions = { ...(
          this.#notification === 'window'
            ? {
              ...NORMAL_WINDOW_OPTS,
              width: win.width,
              height: win.height
            }
            : POPUP_WINDOW_OPTS
        ) };

        if (win) {
          popupOptions.left = (win.left || 0) + (win.width || 0) - (popupOptions.width || 0) - 20;
          popupOptions.top = (win.top || 0) + 80;
        }

        chrome.windows.create(popupOptions
          , (window): void => {
            if (window) {
              this.#windows.push(window.id || 0);
            }
          }
        );
      });
    }
  }
}
