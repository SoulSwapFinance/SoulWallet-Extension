// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType, RequestStakeWithdrawal, StakingType, UnstakingInfo, UnstakingStatus } from '@soul-wallet/extension-base/background/KoniTypes';
import { AccountJson } from '@soul-wallet/extension-base/background/types';
import { getAstarWithdrawable } from '@soul-wallet/extension-base/koni/api/staking/bonding/astar';
import { isActionFromValidator } from '@soul-wallet/extension-base/koni/api/staking/bonding/utils';
import { _STAKING_CHAIN_GROUP } from '@soul-wallet/extension-base/services/chain-service/constants';
import { isSameAddress } from '@soul-wallet/extension-base/utils';
import { AccountSelector, HiddenInput, MetaInfo, PageWrapper } from '@soul-wallet/extension-koni-ui/components';
import { DataContext } from '@soul-wallet/extension-koni-ui/contexts/DataContext';
import { useGetNativeTokenBasicInfo, useGetNominatorInfo, useHandleSubmitTransaction, useInitValidateTransaction, usePreCheckAction, useRestoreTransaction, useSelector, useSetCurrentPage, useTransactionContext, useWatchTransaction } from '@soul-wallet/extension-koni-ui/hooks';
import { submitStakeWithdrawal } from '@soul-wallet/extension-koni-ui/messaging';
import { accountFilterFunc } from '@soul-wallet/extension-koni-ui/Popup/Transaction/helper';
import { FormCallbacks, FormFieldData, ThemeProps, WithdrawParams } from '@soul-wallet/extension-koni-ui/types';
import { convertFieldToObject, isAccountAll, simpleCheckForm } from '@soul-wallet/extension-koni-ui/utils';
import { Button, Form, Icon } from '@subwallet/react-ui';
import { ArrowCircleRight, XCircle } from 'phosphor-react';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { FreeBalance, TransactionContent, TransactionFooter } from '../parts';

type Props = ThemeProps;

const hideFields: Array<keyof WithdrawParams> = ['chain', 'asset', 'type'];
const validateFields: Array<keyof WithdrawParams> = ['from'];

const Component: React.FC<Props> = (props: Props) => {
  useSetCurrentPage('/transaction/withdraw');
  const { className = '' } = props;

  const { t } = useTranslation();
  const navigate = useNavigate();

  const dataContext = useContext(DataContext);
  const { defaultData, onDone, persistData } = useTransactionContext<WithdrawParams>();
  const { chain, type } = defaultData;

  const [form] = Form.useForm<WithdrawParams>();
  const formDefault = useMemo((): WithdrawParams => ({ ...defaultData }), [defaultData]);

  const { isAllAccount } = useSelector((state) => state.accountState);
  const { chainInfoMap } = useSelector((state) => state.chainStore);
  const [isBalanceReady, setIsBalanceReady] = useState(true);

  const from = useWatchTransaction('from', form, defaultData);

  const allNominatorInfo = useGetNominatorInfo(chain, type);
  const nominatorInfo = useGetNominatorInfo(chain, type, from);
  const nominatorMetadata = nominatorInfo[0];

  const unstakingInfo = useMemo((): UnstakingInfo | undefined => {
    if (from && !isAccountAll(from)) {
      if (_STAKING_CHAIN_GROUP.astar.includes(nominatorMetadata.chain)) {
        return getAstarWithdrawable(nominatorMetadata);
      }

      return nominatorMetadata.unstakings.filter((data) => data.status === UnstakingStatus.CLAIMABLE)[0];
    }

    return undefined;
  }, [from, nominatorMetadata]);

  const [isDisable, setIsDisable] = useState(true);
  const [loading, setLoading] = useState(false);

  const { decimals, symbol } = useGetNativeTokenBasicInfo(chain);

  const goHome = useCallback(() => {
    navigate('/home/staking');
  }, [navigate]);

  const onFieldsChange: FormCallbacks<WithdrawParams>['onFieldsChange'] = useCallback((changedFields: FormFieldData[], allFields: FormFieldData[]) => {
    // TODO: field change
    const { empty, error } = simpleCheckForm(allFields, ['asset']);

    const values = convertFieldToObject<WithdrawParams>(allFields);

    setIsDisable(empty || error);
    persistData(values);
  }, [persistData]);

  const { onError, onSuccess } = useHandleSubmitTransaction(onDone);

  const onSubmit: FormCallbacks<WithdrawParams>['onFinish'] = useCallback((values: WithdrawParams) => {
    setLoading(true);

    if (!unstakingInfo) {
      setLoading(false);

      return;
    }

    const params: RequestStakeWithdrawal = {
      unstakingInfo: unstakingInfo,
      chain: nominatorMetadata.chain,
      nominatorMetadata
    };

    if (isActionFromValidator(type, chain)) {
      params.validatorAddress = unstakingInfo.validatorAddress;
    }

    setTimeout(() => {
      submitStakeWithdrawal(params)
        .then(onSuccess)
        .catch(onError)
        .finally(() => {
          setLoading(false);
        });
    }, 300);
  }, [chain, nominatorMetadata, onError, onSuccess, type, unstakingInfo]);

  const onPreCheck = usePreCheckAction(from);

  const filterAccount = useCallback((account: AccountJson): boolean => {
    const nomination = allNominatorInfo.find((data) => isSameAddress(data.address, account.address));

    return (nomination ? nomination.unstakings.filter((data) => data.status === UnstakingStatus.CLAIMABLE).length > 0 : false) && accountFilterFunc(chainInfoMap, type, chain)(account);
  }, [chainInfoMap, allNominatorInfo, chain, type]);

  useRestoreTransaction(form);
  useInitValidateTransaction(validateFields, form, defaultData);

  return (
    <>
      <TransactionContent>
        <PageWrapper resolve={dataContext.awaitStores(['staking'])}>
          <Form
            className={`${className} form-container form-space-sm`}
            form={form}
            initialValues={formDefault}
            onFieldsChange={onFieldsChange}
            onFinish={onSubmit}
          >
            <HiddenInput fields={hideFields} />
            <Form.Item
              hidden={!isAllAccount}
              name={'from'}
            >
              <AccountSelector filter={filterAccount} />
            </Form.Item>
            <FreeBalance
              address={from}
              chain={chain}
              className={'free-balance'}
              label={t('Available balance:')}
              onBalanceReady={setIsBalanceReady}
            />
            <Form.Item>
              <MetaInfo
                className='withdraw-meta-info'
                hasBackgroundWrapper={true}
              >
                <MetaInfo.Chain
                  chain={chain}
                  label={t('Network')}
                />
                {
                  unstakingInfo && (
                    <MetaInfo.Number
                      decimals={decimals}
                      label={t('Amount')}
                      suffix={symbol}
                      value={unstakingInfo.claimable}
                    />
                  )
                }
              </MetaInfo>
            </Form.Item>
          </Form>
        </PageWrapper>
      </TransactionContent>
      <TransactionFooter
        errors={[]}
        warnings={[]}
      >
        <Button
          disabled={loading}
          icon={(
            <Icon
              phosphorIcon={XCircle}
              weight='fill'
            />
          )}
          onClick={goHome}
          schema={'secondary'}
        >
          {t('Cancel')}
        </Button>

        <Button
          disabled={isDisable || !isBalanceReady}
          icon={(
            <Icon
              phosphorIcon={ArrowCircleRight}
              weight='fill'
            />
          )}
          loading={loading}
          onClick={onPreCheck(form.submit, type === StakingType.POOLED ? ExtrinsicType.STAKING_POOL_WITHDRAW : ExtrinsicType.STAKING_WITHDRAW)}
        >
          {t('Continue')}
        </Button>
      </TransactionFooter>
    </>
  );
};

const Withdraw = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.free-balance': {
      marginBottom: token.marginXS
    },

    '.meta-info': {
      marginTop: token.paddingSM
    }
  };
});

export default Withdraw;
