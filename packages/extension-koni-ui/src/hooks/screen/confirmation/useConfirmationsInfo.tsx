// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationRequestBase } from '@soul-wallet/extension-base/background/types';
import { RootState } from '@soul-wallet/extension-koni-ui/stores';
import { ConfirmationQueueItem, CONFIRMATIONS_FIELDS } from '@soul-wallet/extension-koni-ui/stores/base/RequestState';
import { useSelector } from 'react-redux';

export default function useConfirmationsInfo () {
  const confirmations = useSelector((state: RootState) => (state.requestState));

  const confirmationQueue: ConfirmationQueueItem[] = CONFIRMATIONS_FIELDS.reduce((queue, type) => {
    Object.values(confirmations[type]).forEach((item: ConfirmationRequestBase) => {
      queue.push({ type, item } as ConfirmationQueueItem);
    });

    return queue;
  }, [] as ConfirmationQueueItem[])
    // Sort by id asc
    .sort((a, b) => a.item.id > b.item.id ? 1 : -1);

  return {
    confirmationQueue,
    numberOfConfirmations: confirmations.numberOfConfirmations,
    hasConfirmations: confirmations.hasConfirmations
  };
}
