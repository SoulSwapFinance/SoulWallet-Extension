// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ActiveCronAndSubscriptionMap, CronServiceType, RequestCronAndSubscriptionAction, RequestInitCronAndSubscription, SubscriptionServiceType } from '@subwallet/extension-base/background/KoniTypes';
import { MessageTypes, RequestTypes, ResponseType } from '@subwallet/extension-base/background/types';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';

const DEFAULT_SERVICE_MAP = {
  subscription: {
    chainRegistry: true,
    balance: true,
    crowdloan: true,
    staking: true
  },
  cron: {
    price: true,
    nft: true,
    staking: true,
    history: true,
    recoverApi: true,
    checkApiStatus: true
  }
};

export default class Mobile {
  // @ts-ignore
  private state: KoniState;

  constructor (state: KoniState) {
    this.state = state;
  }

  public ping (): string {
    return 'mobile:ping';
  }

  public initCronAndSubscription (
    { cron: { activeServices: activeCronServices, intervalMap: cronIntervalMap },
      subscription: { activeServices: activeSubscriptionServices } }: RequestInitCronAndSubscription): ActiveCronAndSubscriptionMap {
    console.log('initCronAndSubscription');

    return {
      subscription: {
        chainRegistry: true,
        balance: true,
        crowdloan: true,
        staking: true
      },
      cron: {
        price: true,
        nft: true,
        staking: true,
        history: true,
        recoverApi: true,
        checkApiStatus: true
      }
    };
  }

  public subscribeActiveCronAndSubscriptionServiceMap (id: string, port: chrome.runtime.Port): ActiveCronAndSubscriptionMap {
    return DEFAULT_SERVICE_MAP;
  }

  public startCronAndSubscriptionServices ({ cronServices, subscriptionServices }: RequestCronAndSubscriptionAction): void {
    console.log('startCronAndSubscriptionServices');
  }

  public stopCronAndSubscriptionServices ({ cronServices, subscriptionServices }: RequestCronAndSubscriptionAction): void {
    console.log('stopCronAndSubscriptionServices');
  }

  public restartCronAndSubscriptionServices ({ cronServices, subscriptionServices }: RequestCronAndSubscriptionAction): void {
    console.log('restartCronAndSubscriptionServices');
  }

  public startCronServices (services: CronServiceType[]): void {
    console.log('startCronServices');
  }

  public stopCronServices (services: CronServiceType[]): void {
    console.log('stopCronServices');
  }

  public restartCronServices (services: CronServiceType[]): void {
    console.log('stopCronServices');
  }

  public startSubscriptionServices (services: SubscriptionServiceType[]): void {
    console.log('startSubscriptionServices');
  }

  public stopSubscriptionServices (services: SubscriptionServiceType[]): void {
    console.log('stopSubscriptionServices');
  }

  public restartSubscriptionServices (services: SubscriptionServiceType[]): void {
    console.log('restartSubscriptionServices');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async handle<TMessageType extends MessageTypes> (
    id: string,
    type: TMessageType,
    request: RequestTypes[TMessageType],
    port: chrome.runtime.Port): Promise<ResponseType<TMessageType>> {
    switch (type) {
      case 'mobile(ping)':
        return this.ping();
      case 'mobile(cronAndSubscription.init)':
        return this.initCronAndSubscription(request as RequestInitCronAndSubscription);
      case 'mobile(cronAndSubscription.activeService.subscribe)':
        return this.subscribeActiveCronAndSubscriptionServiceMap(id, port);
      case 'mobile(cronAndSubscription.start)':
        return this.startCronAndSubscriptionServices(request as RequestCronAndSubscriptionAction);
      case 'mobile(cronAndSubscription.stop)':
        return this.stopCronAndSubscriptionServices(request as RequestCronAndSubscriptionAction);
      case 'mobile(cronAndSubscription.restart)':
        return this.restartCronAndSubscriptionServices(request as RequestCronAndSubscriptionAction);
      case 'mobile(cron.start)':
        return this.startCronServices(request as CronServiceType[]);
      case 'mobile(cron.stop)':
        return this.stopCronServices(request as CronServiceType[]);
      case 'mobile(cron.restart)':
        return this.restartCronServices(request as CronServiceType[]);
      case 'mobile(subscription.start)':
        return this.startSubscriptionServices(request as SubscriptionServiceType[]);
      case 'mobile(subscription.stop)':
        return this.stopSubscriptionServices(request as SubscriptionServiceType[]);
      case 'mobile(subscription.restart)':
        return this.restartSubscriptionServices(request as SubscriptionServiceType[]);
      default:
        throw new Error(`Unable to handle message of type ${type}`);
    }
  }
}
