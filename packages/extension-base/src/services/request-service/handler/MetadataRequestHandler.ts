// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { MetadataRequest, Resolver } from 'background/types';
import RequestService from 'services/request-service';
import { extractMetadata } from 'services/request-service/helper';
import { MetaRequest } from 'services/request-service/types';
import { MetadataStore } from 'stores';
import { getId } from 'utils/getId';
import { addMetadata, knownMetadata } from '@soul-wallet/extension-chains';
import { MetadataDef } from '@soul-wallet/extension-inject/src/types';
import { BehaviorSubject } from 'rxjs';

export default class MetadataRequestHandler {
  readonly #requestService: RequestService;
  readonly #metaStore: MetadataStore = new MetadataStore();
  readonly #metaRequests: Record<string, MetaRequest> = {};
  public readonly metaSubject: BehaviorSubject<MetadataRequest[]> = new BehaviorSubject<MetadataRequest[]>([]);

  constructor (requestService: RequestService) {
    this.#requestService = requestService;

    extractMetadata(this.#metaStore);
  }

  public get knownMetadata (): MetadataDef[] {
    return knownMetadata();
  }

  public get allMetaRequests (): MetadataRequest[] {
    return Object
      .values(this.#metaRequests)
      .map(({ id, request, url }): MetadataRequest => ({ id, request, url }));
  }

  public get numMetaRequests (): number {
    return Object.keys(this.#metaRequests).length;
  }

  public getMetaRequest (id: string): MetaRequest {
    return this.#metaRequests[id];
  }

  public saveMetadata (meta: MetadataDef): void {
    this.#metaStore.set(meta.genesisHash, meta);

    addMetadata(meta);
  }

  private updateIconMeta (shouldClose?: boolean): void {
    this.metaSubject.next(this.allMetaRequests);
    this.#requestService.updateIconV2(shouldClose);
  }

  private metaComplete = (id: string, resolve: (result: boolean) => void, reject: (error: Error) => void): Resolver<boolean> => {
    const complete = (): void => {
      delete this.#metaRequests[id];
      this.updateIconMeta(true);
    };

    return {
      reject: (error: Error): void => {
        complete();
        reject(error);
      },
      resolve: (result: boolean): void => {
        complete();
        resolve(result);
      }
    };
  };

  public injectMetadata (url: string, request: MetadataDef): Promise<boolean> {
    return new Promise((resolve, reject): void => {
      const id = getId();

      this.#metaRequests[id] = {
        ...this.metaComplete(id, resolve, reject),
        id,
        request,
        url
      };

      this.updateIconMeta();
      this.#requestService.popupOpen();
    });
  }

  public resetWallet () {
    for (const request of Object.values(this.#metaRequests)) {
      request.reject(new Error('Reset wallet'));
    }

    this.metaSubject.next([]);
  }
}
