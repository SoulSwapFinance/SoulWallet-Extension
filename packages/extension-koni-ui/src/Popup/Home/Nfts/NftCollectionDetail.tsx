// Copyright 2023 @soul-wallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NftItem } from '@soul-wallet/extension-base/background/KoniTypes';
import { _isCustomAsset, _isSmartContractToken } from '@soul-wallet/extension-base/services/chain-service/utils';
import { EmptyList, Layout, PageWrapper } from '@soul-wallet/extension-koni-ui/components';
import { SHOW_3D_MODELS_CHAIN } from '@soul-wallet/extension-koni-ui/constants';
import { DataContext } from '@soul-wallet/extension-koni-ui/contexts/DataContext';
import { useNavigateOnChangeAccount } from '@soul-wallet/extension-koni-ui/hooks';
import useNotification from '@soul-wallet/extension-koni-ui/hooks/common/useNotification';
import useTranslation from '@soul-wallet/extension-koni-ui/hooks/common/useTranslation';
import useConfirmModal from '@soul-wallet/extension-koni-ui/hooks/modal/useConfirmModal';
import useDefaultNavigate from '@soul-wallet/extension-koni-ui/hooks/router/useDefaultNavigate';
import useGetChainAssetInfo from '@soul-wallet/extension-koni-ui/hooks/screen/common/useGetChainAssetInfo';
import { deleteCustomAssets } from '@soul-wallet/extension-koni-ui/messaging';
import { NftGalleryWrapper } from '@soul-wallet/extension-koni-ui/Popup/Home/Nfts/component/NftGalleryWrapper';
import { INftCollectionDetail, INftItemDetail } from '@soul-wallet/extension-koni-ui/Popup/Home/Nfts/utils';
import { ThemeProps } from '@soul-wallet/extension-koni-ui/types';
import { ButtonProps, Icon, SwList } from '@subwallet/react-ui';
import CN from 'classnames';
import { Image, Trash } from 'phosphor-react';
import React, { useCallback, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

type Props = ThemeProps

const subHeaderRightButton = <Icon
  customSize={'24px'}
  phosphorIcon={Trash}
  type='phosphor'
  weight={'light'}
/>;

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const location = useLocation();
  const { collectionInfo, nftList } = location.state as INftCollectionDetail;

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { goBack } = useDefaultNavigate();
  const showNotification = useNotification();

  const dataContext = useContext(DataContext);

  useNavigateOnChangeAccount('/home/nfts/collections');

  const originAssetInfo = useGetChainAssetInfo(collectionInfo.originAsset);

  const { handleSimpleConfirmModal } = useConfirmModal({
    title: t<string>('Delete NFT'),
    maskClosable: true,
    closable: true,
    type: 'error',
    subTitle: t<string>('You are about to delete this NFT collection'),
    content: t<string>('Confirm delete this NFT collection'),
    okText: t<string>('Remove')
  });

  const searchNft = useCallback((nftItem: NftItem, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      nftItem.name?.toLowerCase().includes(searchTextLowerCase) ||
      nftItem.id.toLowerCase().includes(searchTextLowerCase)
    );
  }, []);

  const handleOnClickNft = useCallback((state: INftItemDetail) => {
    navigate('/home/nfts/item-detail', { state });
  }, [navigate]);

  const renderNft = useCallback((nftItem: NftItem) => {
    const routingParams = { collectionInfo, nftItem } as INftItemDetail;

    return (
      <NftGalleryWrapper
        fallbackImage={collectionInfo.image}
        handleOnClick={handleOnClickNft}
        have3dViewer={SHOW_3D_MODELS_CHAIN.includes(nftItem.chain)}
        image={nftItem.image}
        key={`${nftItem.chain}_${nftItem.collectionId}_${nftItem.id}`}
        routingParams={routingParams}
        title={nftItem.name || nftItem.id}
      />
    );
  }, [collectionInfo, handleOnClickNft]);

  const onBack = useCallback(() => {
    navigate('/home/nfts/collections');
  }, [navigate]);

  const emptyNft = useCallback(() => {
    return (
      <EmptyList
        emptyMessage={t('Your NFT collectible will appear here!')}
        emptyTitle={t('No NFT collectible')}
        phosphorIcon={Image}
      />
    );
  }, [t]);

  const handleDeleteNftCollection = useCallback(() => {
    handleSimpleConfirmModal().then(() => {
      if (collectionInfo.originAsset) {
        deleteCustomAssets(collectionInfo.originAsset)
          .then((result) => {
            if (result) {
              goBack();
              showNotification({
                message: t('Deleted NFT collection successfully')
              });
            } else {
              showNotification({
                message: t('Deleted NFT collection unsuccessfully')
              });
            }
          })
          .catch(console.log);
      }
    }).catch(console.log);
  }, [collectionInfo.originAsset, goBack, handleSimpleConfirmModal, showNotification, t]);

  const subHeaderButton: ButtonProps[] = [
    {
      icon: subHeaderRightButton,
      onClick: handleDeleteNftCollection,
      disabled: !(originAssetInfo && _isSmartContractToken(originAssetInfo) && _isCustomAsset(originAssetInfo.slug))
    }
  ];

  return (
    <PageWrapper
      className={`${className}`}
      resolve={dataContext.awaitStores(['nft'])}
    >
      <Layout.Base
        onBack={onBack}
        showBackButton={true}
        showSubHeader={true}
        subHeaderBackground={'transparent'}
        subHeaderCenter={false}
        subHeaderIcons={subHeaderButton}
        subHeaderPaddingVertical={true}
        title={(
          <div className={CN('header-content')}>
            <div className={CN('collection-name')}>
              {collectionInfo.collectionName || collectionInfo.collectionId}
            </div>
            <div className={CN('collection-count')}>
              &nbsp;({nftList.length})
            </div>
          </div>
        )}
      >
        <SwList.Section
          className={CN('nft_item_list__container')}
          displayGrid={true}
          enableSearchInput={true}
          gridGap={'14px'}
          list={nftList}
          minColumnWidth={'160px'}
          renderItem={renderNft}
          renderOnScroll={true}
          renderWhenEmpty={emptyNft}
          searchFunction={searchNft}
          searchMinCharactersCount={2}
          searchPlaceholder={t<string>('Search NFT name or ID')}
        />
      </Layout.Base>
    </PageWrapper>
  );
}

const NftCollectionDetail = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    color: token.colorTextLight1,
    fontSize: token.fontSizeLG,

    '.header-content': {
      color: token.colorTextBase,
      fontWeight: token.fontWeightStrong,
      fontSize: token.fontSizeHeading4,
      lineHeight: token.lineHeightHeading4,
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden'
    },

    '.collection-name': {
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },

    '.nft_item_list__container': {
      paddingTop: 14,
      flex: 1,
      height: '100%',

      '.ant-sw-list': {
        paddingBottom: 1,
        marginBottom: -1
      }
    },

    '&__inner': {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  });
});

export default NftCollectionDetail;
