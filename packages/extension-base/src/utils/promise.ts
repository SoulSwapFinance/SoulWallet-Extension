// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

export function createPromiseHandler<T> () {
  let _resolve: (value: T) => void = () => {
    console.warn('This promise handler is not implemented');
  };

  let _reject: (reason?: unknown) => void = () => {
    console.warn('This promise handler is not implemented');
  };

  const promise = new Promise<T>((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  });

  return {
    resolve: _resolve,
    reject: _reject,
    promise
  };
}

export type PromiseHandler<T> = ReturnType<typeof createPromiseHandler<T>>;
