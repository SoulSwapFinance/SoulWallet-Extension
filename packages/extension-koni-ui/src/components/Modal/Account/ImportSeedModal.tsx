// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { IMPORT_ACCOUNT_MODAL, IMPORT_SEED_MODAL } from '@soul-wallet/extension-koni-ui/constants';
import { useTranslation } from '@soul-wallet/extension-koni-ui/hooks';
import { ThemeProps } from '@soul-wallet/extension-koni-ui/types';
import { FileArrowDown } from 'phosphor-react';
import React from 'react';
import styled from 'styled-components';

import AccountTypeModal from './AccountTypeModal';

type Props = ThemeProps;

const Component: React.FC<Props> = ({ className }: Props) => {
  const { t } = useTranslation();

  return (
    <AccountTypeModal
      className={className}
      icon={FileArrowDown}
      id={IMPORT_SEED_MODAL}
      label={t('Import account')}
      previousId={IMPORT_ACCOUNT_MODAL}
      url={'/accounts/import-seed-phrase'}
    />
  );
};

const ImportSeedModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {};
});

export default ImportSeedModal;
