// Copyright 2019-2022 @polkadot/extension-inject authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Injected, InjectedWindow, InjectOptions } from './types';

import { EvmProvider } from './types';

export { packageInfo } from './packageInfo';

// It is recommended to always use the function below to shield the extension and dapp from
// any future changes. The exposed interface will manage access between the 2 environments,
// be it via window (current), postMessage (under consideration) or any other mechanism
export function injectExtension (enable: (origin: string) => Promise<Injected>, { name, version }: InjectOptions): void {
  // small helper with the typescript types, just cast window
  const windowInject = window as Window & InjectedWindow;

  // don't clobber the existing object, we will add it (or create as needed)
  windowInject.injectedWeb3 = windowInject.injectedWeb3 || {};

  // add our enable function
  windowInject.injectedWeb3[name] = {
    enable: (origin: string): Promise<Injected> =>
      enable(origin),
    version
  };
}

// Inject EVM Provider
export function injectEvmExtension (evmProvider: EvmProvider): void {
  // small helper with the typescript types, just cast window
  const windowInject = window as Window & InjectedWindow;

  // add our enable function
  if (windowInject.SoulWallet) {
    // Provider has been initialized in proxy mode
    windowInject.SoulWallet.provider = evmProvider;
  } else {
    // Provider has been initialized in direct mode
    windowInject.SoulWallet = evmProvider;
  }

  windowInject.dispatchEvent(new Event('soulwallet#initialized'));

  // Publish to global if window.ethereum is not available
  windowInject.addEventListener('load', () => {
    if (!windowInject.ethereum) {
      windowInject.ethereum = evmProvider;
      windowInject.dispatchEvent(new Event('ethereum#initialized'));
    }
  });

  // Todo: Need more discuss to make SoulWallet as global before window load because it can be conflict with MetaMask
  // windowInject.ethereum = evmProvider;
  // windowInject.dispatchEvent(new Event('ethereum#initialized'));
}
