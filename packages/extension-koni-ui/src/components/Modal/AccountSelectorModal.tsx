// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson } from '@subwallet/extension-base/background/types';
import { isAccountAll } from '@subwallet/extension-base/utils';
import EmptyAccount from '@subwallet/extension-koni-ui/components/Account/EmptyAccount';
import AccountItemWithName from '@subwallet/extension-koni-ui/components/Account/Item/AccountItemWithName';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import React, { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

interface Props extends ThemeProps {
  id?: string,
  onSelectItem: (item: AccountJson) => void,
  itemFilter?: (account: AccountJson) => boolean
}

export const AccountSelectorModalId = 'accountSelectorModalId';

const renderEmpty = () => <EmptyAccount />;

function defaultFiler (account: AccountJson): boolean {
  return !isAccountAll(account.address);
}

function Component ({ className = '', id = AccountSelectorModalId, itemFilter, onSelectItem }: Props): React.ReactElement<Props> {
  const items = useSelector((state: RootState) => state.accountState.accounts).filter(itemFilter || defaultFiler);
  const { t } = useTranslation();
  const { inactiveModal } = useContext(ModalContext);

  const onCancel = useCallback(() => {
    inactiveModal(id);
  }, [id, inactiveModal]);

  const searchFunction = useCallback((item: AccountJson, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      item.address.toLowerCase().includes(searchTextLowerCase) ||
      (item.name
        ? item.name.toLowerCase().includes(searchTextLowerCase)
        : false)
    );
  }, []);

  const _onSelectItem = useCallback((item: AccountJson) => {
    return () => {
      onSelectItem && onSelectItem(item);
    };
  }, [onSelectItem]);

  const renderItem = useCallback((item: AccountJson) => {
    return (
      <AccountItemWithName
        accountName={item.name}
        address={item.address}
        avatarSize={24}
        key={item.address}
        onClick={_onSelectItem(item)}
      />
    );
  }, [_onSelectItem]);

  return (
    <SwModal
      className={`${className} account-selector-modal`}
      id={id}
      onCancel={onCancel}
      title={t('Select account')}
    >
      <SwList.Section
        enableSearchInput={true}
        list={items}
        renderItem={renderItem}
        renderWhenEmpty={renderEmpty}
        searchFunction={searchFunction}
        searchMinCharactersCount={2}
        searchPlaceholder={t<string>('Search account')}
      />
    </SwModal>
  );
}

export const AccountSelectorModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-content': {
      minHeight: 474
    },

    '.ant-sw-list-search-input': {
      paddingBottom: token.paddingXS
    },

    '.ant-sw-modal-body': {
      paddingLeft: 0,
      paddingRight: 0,
      paddingBottom: token.padding,
      marginBottom: 0,
      display: 'flex'
    },

    '.ant-sw-list-section': {
      flex: 1
    },

    '.ant-sw-list-section .ant-sw-list': {
      paddingBottom: 0
    },

    '.account-item-with-name + .account-item-with-name': {
      marginTop: token.marginXS
    }
  });
});
