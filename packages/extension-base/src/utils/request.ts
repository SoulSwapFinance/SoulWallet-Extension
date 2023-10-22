// Copyright 2023 @soul-wallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { EXTENSION_REQUEST_URL } from '@subwallet/extension-base/services/request-service/constants';

export function isInternalRequest (url: string): boolean {
  return url === EXTENSION_REQUEST_URL;
}
