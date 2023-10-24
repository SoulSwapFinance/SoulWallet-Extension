// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@soul-wallet/extension-base/background/KoniTypes';
import { AccountJson } from '@soul-wallet/extension-base/background/types';
import { detectTranslate } from '@soul-wallet/extension-base/utils';
import { ALL_STAKING_ACTIONS } from '@soul-wallet/extension-koni-ui/constants';
import { BLOCK_ACTION_LEDGER_NETWORKS, PredefinedLedgerNetwork } from '@soul-wallet/extension-koni-ui/constants/ledger';
import { AccountSignMode } from '@soul-wallet/extension-koni-ui/types';
import { getSignMode } from '@soul-wallet/extension-koni-ui/utils';
import { useCallback } from 'react';

import { isEthereumAddress } from '@polkadot/util-crypto';

import { useNotification, useTranslation } from '../common';
import useGetAccountByAddress from './useGetAccountByAddress';

const usePreCheckAction = (address?: string, blockAllAccount = true, message?: string): ((onClick: VoidFunction, action: ExtrinsicType) => VoidFunction) => {
  const notify = useNotification();
  const { t } = useTranslation();

  const account = useGetAccountByAddress(address);

  const getAccountTypeTitle = useCallback((account: AccountJson): string => {
    const signMode = getSignMode(account);

    switch (signMode) {
      case AccountSignMode.LEDGER:
        return t('Ledger account');
      case AccountSignMode.ALL_ACCOUNT:
        return t('All account');
      case AccountSignMode.PASSWORD:
        return t('Normal account');
      case AccountSignMode.QR:
        return t('QR signer account');
      case AccountSignMode.READ_ONLY:
        return t('Watch-only account');
      case AccountSignMode.UNKNOWN:
      default:
        return t('Unknown account');
    }
  }, [t]);

  return useCallback((onClick: VoidFunction, action: ExtrinsicType) => {
    return () => {
      if (!account) {
        notify({
          message: t('Account not exists'),
          type: 'info',
          duration: 1.5
        });
      } else {
        const mode = getSignMode(account);
        let block = false;
        let accountTitle = getAccountTypeTitle(account);
        let defaultMessage = detectTranslate('The account you are using is {{accountTitle}}, you cannot use this feature with it');

        switch (mode) {
          case AccountSignMode.READ_ONLY:
          case AccountSignMode.UNKNOWN:
            block = true;
            break;
          case AccountSignMode.ALL_ACCOUNT:
            if (blockAllAccount) {
              block = true;
            }

            break;
        }

        if (ALL_STAKING_ACTIONS.includes(action)) {
          defaultMessage = detectTranslate('You are using a {{accountTitle}}. Staking is not supported with this account type');
        }

        if (mode === AccountSignMode.LEDGER) {
          const networkBlock: string[] = BLOCK_ACTION_LEDGER_NETWORKS[action] || [];
          const isEthereumAccount = isEthereumAddress(account.address);

          if (networkBlock.includes('*')) { // Block all network
            block = true;
          } else if ((networkBlock.includes('evm') && isEthereumAccount)) { // Block evm network
            accountTitle = t('Ledger - EVM account');
            block = true;
          } else if ((networkBlock.includes('substrate') && !isEthereumAccount)) { // Block evm network
            accountTitle = t('Ledger - Substrate account');
            block = true;
          } else {
            const ledgerNetwork = PredefinedLedgerNetwork.find((network) => network.genesisHash === account.originGenesisHash);
            const networkName = ledgerNetwork?.accountName || 'Unknown';
            const slug = ledgerNetwork?.slug || '';

            if (networkBlock.includes(slug)) {
              notify({
                message: t(
                  'Ledger does not support this action with {{network}}',
                  { replace: { network: networkName } }
                ),
                type: 'info',
                duration: 1.5
              });

              return;
            }
          }
        }

        if (!block) {
          onClick();
        } else {
          notify({
            message: t(
              message ?? defaultMessage,
              { replace: { accountTitle: accountTitle } }
            ),
            type: 'info',
            duration: 1.5
          });
        }
      }
    };
  }, [account, blockAllAccount, getAccountTypeTitle, message, notify, t]);
};

export default usePreCheckAction;
