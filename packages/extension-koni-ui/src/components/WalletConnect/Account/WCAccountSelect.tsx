// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson } from '@subwallet/extension-base/background/types';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { isSameAddress } from '@subwallet/extension-base/utils';
import { AccountItemWithName, AlertBox } from '@soul-wallet/extension-koni-ui/components';
import { useTranslation } from '@soul-wallet/extension-koni-ui/hooks';
import { ThemeProps } from '@soul-wallet/extension-koni-ui/types';
import { searchAccountFunction } from '@soul-wallet/extension-koni-ui/utils';
import { Button, Icon, ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import { SwListSectionRef } from '@subwallet/react-ui/es/sw-list';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import styled from 'styled-components';

import { GeneralEmptyList } from '../../EmptyList';
import WCAccountInput from './WCAccountInput';

interface Props extends ThemeProps {
  id: string;
  selectedAccounts: string[];
  appliedAccounts: string[];
  availableAccounts: AccountJson[];
  onSelectAccount: (account: string, applyImmediately?: boolean) => VoidFunction;
  useModal: boolean;
  onApply: () => void;
  onCancel: () => void;
}

const renderEmpty = () => <GeneralEmptyList />;

const Component: React.FC<Props> = (props: Props) => {
  const { appliedAccounts, availableAccounts, className, id, onApply, onCancel, onSelectAccount, selectedAccounts, useModal } = props;

  const { t } = useTranslation();

  const { activeModal, checkActive, inactiveModal } = useContext(ModalContext);

  const sectionRef = useRef<SwListSectionRef>(null);

  const isActive = checkActive(id);

  const onOpenModal = useCallback(() => {
    activeModal(id);
  }, [activeModal, id]);

  const onCloseModal = useCallback(() => {
    inactiveModal(id);
    onCancel();
  }, [inactiveModal, id, onCancel]);

  const _onApply = useCallback(() => {
    inactiveModal(id);
    onApply();
  }, [id, inactiveModal, onApply]);

  const renderItem = useCallback((item: AccountJson) => {
    const selected = !!selectedAccounts.find((address) => isSameAddress(address, item.address));

    return (
      <AccountItemWithName
        accountName={item.name}
        address={item.address}
        avatarSize={24}
        direction='horizontal'
        isSelected={selected}
        key={item.address}
        onClick={onSelectAccount(item.address, false)}
        showUnselectIcon={true}
      />
    );
  }, [onSelectAccount, selectedAccounts]);

  useEffect(() => {
    if (!isActive) {
      sectionRef.current?.setSearchValue('');
    }
  }, [isActive]);

  return (
    <div className={CN(className)}>
      {
        !availableAccounts.length
          ? (
            <AlertBox
              description={t('You don’t have any accounts. Please create a new account')}
              title={t('No accounts found')}
              type='warning'
            />
          )
          : useModal
            ? (
              <>
                <WCAccountInput
                  accounts={availableAccounts}
                  onClick={onOpenModal}
                  selected={appliedAccounts}
                />
                <SwModal
                  className={CN(className, 'account-modal')}
                  footer={(
                    <Button
                      block
                      disabled={!selectedAccounts.length}
                      icon={(
                        <Icon
                          phosphorIcon={CheckCircle}
                          weight={'fill'}
                        />
                      )}
                      onClick={_onApply}
                    >
                      {t('Apply {{number}} accounts', { replace: { number: selectedAccounts.length } })}
                    </Button>
                  )}
                  id={id}
                  onCancel={onCloseModal}
                  title={t('Select account')}
                >
                  <SwList.Section
                    className='account-list'
                    displayRow
                    enableSearchInput={true}
                    list={availableAccounts}
                    ref={sectionRef}
                    renderItem={renderItem}
                    renderWhenEmpty={renderEmpty}
                    rowGap='var(--row-gap)'
                    searchFunction={searchAccountFunction}
                    searchMinCharactersCount={2}
                    searchPlaceholder={t<string>('Search account')}
                  />
                </SwModal>
              </>
            )
            : (
              <>
                <div className={CN('account-list', 'no-modal')}>
                  {availableAccounts.length > 1 && (
                    <AccountItemWithName
                      accountName={'Select all accounts'}
                      accounts={availableAccounts}
                      address={ALL_ACCOUNT_KEY}
                      avatarSize={24}
                      isSelected={selectedAccounts.length === availableAccounts.length}
                      onClick={onSelectAccount(ALL_ACCOUNT_KEY, true)}
                      showUnselectIcon
                    />
                  )}
                  {availableAccounts.map((item) => {
                    const selected = !!selectedAccounts.find((address) => isSameAddress(address, item.address));

                    return (
                      <AccountItemWithName
                        accountName={item.name}
                        address={item.address}
                        avatarSize={24}
                        isSelected={selected}
                        key={item.address}
                        onClick={onSelectAccount(item.address, true)}
                        showUnselectIcon
                      />
                    );
                  })}
                </div>
                <div className={CN(className, 'additional-content')}>
                  {t('Make sure you trust this site before connecting')}
                </div>
              </>
            )
      }
    </div>
  );
};

const WCAccountSelect = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '--row-gap': token.sizeXS,

    '.account-list.no-modal': {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--row-gap)'
    },

    '&.account-modal': {
      '.ant-sw-modal-body': {
        padding: `${token.padding}px 0 ${token.padding}px`,
        flexDirection: 'column',
        display: 'flex'
      }
    },

    '.additional-content': {
      padding: token.padding,
      paddingBottom: 0,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      textAlign: 'center',
      color: token.colorTextTertiary
    }
  };
});

export default WCAccountSelect;
