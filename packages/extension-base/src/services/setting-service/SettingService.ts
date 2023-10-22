// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { LanguageType, PassPhishing, RequestSettingsType, UiSettings } from 'background/KoniTypes';
import { LANGUAGE } from 'constants';
import PassPhishingStore from 'stores/PassPhishingStore';
import SettingsStore from 'stores/Settings';
import { Subject } from 'rxjs';

import i18n from './i18n/i18n';
import { DEFAULT_SETTING } from './constants';

export default class SettingService {
  private readonly settingsStore = new SettingsStore();
  private readonly passPhishingStore = new PassPhishingStore();

  constructor () {
    let old: LanguageType = localStorage.getItem(LANGUAGE) as LanguageType || 'en';

    const updateLanguage = ({ language }: UiSettings) => {
      if (language !== old) {
        old = language;
        i18n.changeLanguage(language).catch(console.error);
      }
    };

    this.getSettings(updateLanguage);
    this.settingsStore.getSubject().subscribe({
      next: updateLanguage
    });
  }

  public getSubject (): Subject<RequestSettingsType> {
    return this.settingsStore.getSubject();
  }

  public getSettings (update: (value: RequestSettingsType) => void): void {
    this.settingsStore.get('Settings', (value) => {
      update({
        ...DEFAULT_SETTING,
        ...(value || {})
      });
    });
  }

  public setSettings (data: RequestSettingsType, callback?: () => void): void {
    this.settingsStore.set('Settings', data, callback);
  }

  public passPhishingSubject (): Subject<Record<string, PassPhishing>> {
    return this.passPhishingStore.getSubject();
  }

  public getPassPhishingList (update: (value: Record<string, PassPhishing>) => void): void {
    this.passPhishingStore.get('PassPhishing', (value) => {
      update(value || {});
    });
  }

  public setPassPhishing (data: Record<string, PassPhishing>, callback?: () => void): void {
    this.passPhishingStore.set('PassPhishing', data, callback);
  }

  // Use for mobile only
  public get isAlwaysRequired (): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.settingsStore.get('Settings', (value) => {
        resolve(!value.timeAutoLock);
      });
    });
  }

  public resetWallet () {
    this.settingsStore.set('Settings', DEFAULT_SETTING);
    this.passPhishingStore.set('PassPhishing', {});
  }
}
