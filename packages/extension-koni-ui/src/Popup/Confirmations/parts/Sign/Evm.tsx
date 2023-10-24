// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationDefinitions, ConfirmationResult, EvmSendTransactionRequest, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { CONFIRMATION_QR_MODAL } from '@soul-wallet/extension-koni-ui/constants/modal';
import { InjectContext } from '@soul-wallet/extension-koni-ui/contexts/InjectContext';
import { useGetChainInfoByChainId, useLedger, useNotification } from '@soul-wallet/extension-koni-ui/hooks';
import useUnlockChecker from '@soul-wallet/extension-koni-ui/hooks/common/useUnlockChecker';
import { completeConfirmation } from '@soul-wallet/extension-koni-ui/messaging';
import { PhosphorIcon, SigData, ThemeProps } from '@soul-wallet/extension-koni-ui/types';
import { AccountSignMode } from '@soul-wallet/extension-koni-ui/types/account';
import { EvmSignatureSupportType } from '@soul-wallet/extension-koni-ui/types/confirmation';
import { getSignMode, isEvmMessage, removeTransactionPersist } from '@soul-wallet/extension-koni-ui/utils';
import { Button, Icon, ModalContext } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, QrCode, Swatches, Wallet, XCircle } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { hexToU8a, u8aToU8a } from '@polkadot/util';

import { DisplayPayloadModal, EvmQr, ScanSignature } from '../Qr';

interface Props extends ThemeProps {
  id: string;
  type: EvmSignatureSupportType;
  payload: ConfirmationDefinitions[EvmSignatureSupportType][0];
  extrinsicType?: ExtrinsicType;
}

const handleConfirm = async (type: EvmSignatureSupportType, id: string, payload: string) => {
  return await completeConfirmation(type, {
    id,
    isApproved: true,
    payload
  } as ConfirmationResult<string>);
};

const handleCancel = async (type: EvmSignatureSupportType, id: string) => {
  return await completeConfirmation(type, {
    id,
    isApproved: false
  } as ConfirmationResult<string>);
};

const handleSignature = async (type: EvmSignatureSupportType, id: string, signature: string) => {
  return await completeConfirmation(type, {
    id,
    isApproved: true,
    payload: signature
  } as ConfirmationResult<string>);
};

const Component: React.FC<Props> = (props: Props) => {
  const { className, extrinsicType, id, payload, type } = props;
  const { payload: { account, canSign, hashPayload } } = payload;
  const chainId = (payload.payload as EvmSendTransactionRequest)?.chainId || 1;

  const { t } = useTranslation();
  const notify = useNotification();

  const { activeModal } = useContext(ModalContext);
  const { evmWallet } = useContext(InjectContext);

  const chain = useGetChainInfoByChainId(chainId);
  const checkUnlock = useUnlockChecker();

  const signMode = useMemo(() => getSignMode(account), [account]);
  const isLedger = useMemo(() => signMode === AccountSignMode.LEDGER, [signMode]);
  const isMessage = isEvmMessage(payload);

  const [loading, setLoading] = useState(false);

  const { error: ledgerError,
    isLoading: isLedgerLoading,
    isLocked,
    ledger,
    refresh: refreshLedger,
    signMessage: ledgerSignMessage,
    signTransaction: ledgerSignTransaction,
    warning: ledgerWarning } = useLedger(chain?.slug, isLedger);

  const isLedgerConnected = useMemo(() => !isLocked && !isLedgerLoading && !!ledger, [
    isLedgerLoading,
    isLocked,
    ledger
  ]);

  const approveIcon = useMemo((): PhosphorIcon => {
    switch (signMode) {
      case AccountSignMode.QR:
        return QrCode;
      case AccountSignMode.LEDGER:
        return Swatches;
      case AccountSignMode.INJECTED:
        return Wallet;
      default:
        return CheckCircle;
    }
  }, [signMode]);

  // Handle buttons actions
  const onCancel = useCallback(() => {
    setLoading(true);
    handleCancel(type, id).finally(() => {
      setLoading(false);
    });
  }, [id, type]);

  const onApprovePassword = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      handleConfirm(type, id, '').finally(() => {
        setLoading(false);
      });
    }, 1000);
  }, [id, type]);

  const onApproveSignature = useCallback((signature: SigData) => {
    setLoading(true);

    setTimeout(() => {
      handleSignature(type, id, signature.signature)
        .catch((e) => {
          console.log(e);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);
  }, [id, type]);

  const onConfirmQr = useCallback(() => {
    activeModal(CONFIRMATION_QR_MODAL);
  }, [activeModal]);

  const onConfirmLedger = useCallback(() => {
    if (!hashPayload) {
      return;
    }

    if (!isLedgerConnected || !ledger) {
      refreshLedger();

      return;
    }

    setLoading(true);

    setTimeout(() => {
      const signPromise = isMessage ? ledgerSignMessage(u8aToU8a(hashPayload), account.accountIndex, account.addressOffset) : ledgerSignTransaction(hexToU8a(hashPayload), account.accountIndex, account.addressOffset);

      signPromise
        .then(({ signature }) => {
          onApproveSignature({ signature });
        })
        .catch((e: Error) => {
          console.log(e);
          setLoading(false);
        });
    });
  }, [account.accountIndex, account.addressOffset, hashPayload, isLedgerConnected, isMessage, ledger, ledgerSignMessage, ledgerSignTransaction, onApproveSignature, refreshLedger]);

  const onConfirmInject = useCallback(() => {
    if (evmWallet) {
      let promise: Promise<`0x${string}`>;

      if (isMessage) {
        promise = evmWallet.request<`0x${string}`>({ method: payload.payload.type, params: [account.address, payload.payload.payload] });
      } else {
        promise = new Promise<`0x${string}`>((resolve, reject) => {
          const { account, canSign, estimateGas, hashPayload, isToContract, parseData, ...transactionConfig } = payload.payload;

          evmWallet.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainId.toString(16) }]
          })
            .then(() => evmWallet.request<`0x${string}`>({
              method: 'eth_sendTransaction',
              params: [transactionConfig]
            }))
            .then((value) => {
              resolve(value);
            })
            .catch(reject);
        });
      }

      setLoading(true);
      promise
        .then((signature) => {
          onApproveSignature({ signature });
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [account.address, chainId, evmWallet, isMessage, onApproveSignature, payload.payload]);

  const onConfirm = useCallback(() => {
    removeTransactionPersist(extrinsicType);

    switch (signMode) {
      case AccountSignMode.QR:
        onConfirmQr();
        break;
      case AccountSignMode.LEDGER:
        onConfirmLedger();
        break;
      case AccountSignMode.INJECTED:
        onConfirmInject();
        break;
      default:
        checkUnlock().then(() => {
          onApprovePassword();
        }).catch(() => {
          // Unlock is cancelled
        });
    }
  }, [checkUnlock, extrinsicType, onConfirmInject, onApprovePassword, onConfirmLedger, onConfirmQr, signMode]);

  useEffect(() => {
    !!ledgerError && notify({
      message: ledgerError,
      type: 'error'
    });
  }, [ledgerError, notify]);

  useEffect(() => {
    !!ledgerWarning && notify({
      message: ledgerWarning,
      type: 'warning'
    });
  }, [ledgerWarning, notify]);

  return (
    <div className={CN(className, 'confirmation-footer')}>
      <Button
        disabled={loading}
        icon={(
          <Icon
            phosphorIcon={XCircle}
            weight='fill'
          />
        )}
        onClick={onCancel}
        schema={'secondary'}
      >
        {t('Cancel')}
      </Button>
      <Button
        disabled={!canSign}
        icon={(
          <Icon
            phosphorIcon={approveIcon}
            weight='fill'
          />
        )}
        loading={loading}
        onClick={onConfirm}
      >
        {t('Approve')}
      </Button>
      {
        signMode === AccountSignMode.QR && (
          <DisplayPayloadModal>
            <EvmQr
              address={account.address}
              hashPayload={hashPayload}
              isMessage={isEvmMessage(payload)}
            />
          </DisplayPayloadModal>
        )
      }
      {signMode === AccountSignMode.QR && <ScanSignature onSignature={onApproveSignature} />}
    </div>
  );
};

const EvmSignArea = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {};
});

export default EvmSignArea;
