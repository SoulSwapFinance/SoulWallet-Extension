// Copyright 2023 @soul-wallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Web3Transaction } from '@soul-wallet/extension-base/src/signers/types';
import { addHexPrefix } from 'ethereumjs-util';
import { ethers, SignatureLike, TransactionLike } from 'ethers';

export const mergeTransactionAndSignature = (tx: Web3Transaction, _rawSignature: `0x${string}`): `0x${string}` => {
  const _signature = _rawSignature.slice(2);

  const signature: SignatureLike = {
    r: `0x${_signature.substring(0, 64)}`,
    s: `0x${_signature.substring(64, 128)}`,
    v: parseInt(`0x${_signature.substring(128)}`)
  };

  const transaction: TransactionLike = {
    nonce: tx.nonce,
    gasPrice: addHexPrefix(tx.gasPrice.toString(16)),
    gasLimit: addHexPrefix(tx.gasLimit.toString(16)),
    to: tx.to,
    value: addHexPrefix(tx.value.toString(16)),
    data: tx.data,
    chainId: tx.chainId,
    signature: signature
  };

  return ethers.Transaction.from(transaction).serialized as `0x${string}`;
};
