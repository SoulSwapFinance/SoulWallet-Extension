// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

// Stateless service handle runtime event on background
import { EventItem, EventRegistry, EventType } from '@soul-wallet/extension-base/services/event-service/types';
import EventEmitter from 'eventemitter3';

export class EventService extends EventEmitter<EventRegistry> {
  private lazyTime: number;
  private timeoutId: NodeJS.Timeout | null;
  private pendingEvents: EventItem<EventType>[] = [];
  private lazyEmitter = new EventEmitter<{lazy: [EventItem<EventType>[], EventType[]]}>();

  public readonly waitCryptoReady: Promise<boolean>;
  public readonly waitDatabaseReady: Promise<boolean>;
  public readonly waitKeyringReady: Promise<boolean>;
  public readonly waitAccountReady: Promise<boolean>;
  public readonly waitChainReady: Promise<boolean>;
  public readonly waitAssetReady: Promise<boolean>;

  constructor (options: { lazyTime: number } = { lazyTime: 300 }) {
    super();
    this.lazyTime = options.lazyTime;
    this.timeoutId = null;
    this.waitCryptoReady = this.generateWaitPromise('crypto.ready');
    this.waitDatabaseReady = this.generateWaitPromise('database.ready');
    this.waitKeyringReady = this.generateWaitPromise('keyring.ready');
    this.waitAccountReady = this.generateWaitPromise('account.ready');
    this.waitChainReady = this.generateWaitPromise('chain.ready');
    this.waitAssetReady = this.generateWaitPromise('asset.ready');
  }

  private generateWaitPromise<T extends EventType> (eventType: T): Promise<boolean> {
    return new Promise((resolve) => {
      this.once(eventType, (isReady) => {
        resolve(isReady);
      });
    });
  }

  private setLazyTimeout (): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.emitLazy();
    }, this.lazyTime);
  }

  private emitLazy (): void {
    try {
      this.lazyEmitter.emit('lazy', this.pendingEvents, this.pendingEvents.map((e) => e.type));
    } catch (e) {
      console.error('Get error in some listener of lazy event', e);
    }

    this.pendingEvents = [];
    this.timeoutId = null;
  }

  public onLazy (callback: (events: EventItem<EventType>[], eventTypes: EventType[]) => void): void {
    this.lazyEmitter.on('lazy', callback);
  }

  public offLazy (callback: (events: EventItem<EventType>[], eventTypes: EventType[]) => void): void {
    this.lazyEmitter.off('lazy', callback);
  }

  public onceLazy (callback: (events: EventItem<EventType>[], eventTypes: EventType[]) => void): void {
    this.lazyEmitter.once('lazy', callback);
  }

  public override emit<T extends EventType> (eventType: T, ...args: EventEmitter.EventArgs<EventRegistry, T>): boolean {
    console.debug('Emit event: ', eventType, ...args);
    this.pendingEvents.push({ type: eventType, data: args as EventRegistry[T] });
    this.setLazyTimeout();

    return super.emit(eventType, ...args);
  }
}
