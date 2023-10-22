// Copyright 2023 @soul-wallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@soul-wallet/chain-list/src/types';
import { NominationInfo, NominatorMetadata, StakingStatus, StakingType, UnstakingInfo, UnstakingStatus } from '@subwallet/extension-base/background/KoniTypes';
import { getAstarWithdrawable } from '@subwallet/extension-base/koni/api/staking/bonding/astar';
import { _KNOWN_CHAIN_INFLATION_PARAMS, _STAKING_CHAIN_GROUP, _SUBSTRATE_DEFAULT_INFLATION_PARAMS, _SubstrateInflationParams } from '@subwallet/extension-base/services/chain-service/constants';
import { _getChainNativeTokenBasicInfo } from '@subwallet/extension-base/services/chain-service/utils';
import { detectTranslate, parseRawNumber, reformatAddress } from '@subwallet/extension-base/utils';
import { balanceFormatter, formatNumber } from '@subwallet/extension-base/utils/number';
import { t } from 'i18next';

import { ApiPromise } from '@polkadot/api';
import { BN, BN_BILLION, BN_HUNDRED, BN_MILLION, BN_THOUSAND, BN_ZERO, bnToU8a, stringToU8a, u8aConcat } from '@polkadot/util';

export interface PalletNominationPoolsPoolMember {
  poolId: number,
  points: number,
  lasRecordedRewardCounter: number,
  unbondingEras: Record<string, number>
}

export interface PalletDappsStakingDappInfo {
  address: string,
  name: string,
  gitHubUrl: string,
  tags: string[],
  url: string,
  imagesUrl: string[]
}

export interface PalletDappsStakingUnlockingChunk {
  amount: number,
  unlockEra: number
}

export interface PalletDappsStakingAccountLedger {
  locked: number,
  unbondingInfo: {
    unlockingChunks: PalletDappsStakingUnlockingChunk[]
  }
}

export interface BlockHeader {
  parentHash: string,
  number: number,
  stateRoot: string,
  extrinsicsRoot: string
}

export interface ParachainStakingStakeOption {
  owner: string,
  amount: number
}

export interface ParachainStakingCandidateMetadata {
  bond: string,
  delegationCount: number,
  totalCounted: string,
  lowestTopDelegationAmount: string,
  status: any | 'Active'
}

export enum PalletParachainStakingRequestType {
  REVOKE = 'revoke',
  DECREASE = 'decrease',
  BOND_LESS = 'bondLess'
}

export interface PalletParachainStakingDelegationRequestsScheduledRequest {
  delegator: string,
  whenExecutable: number,
  action: Record<PalletParachainStakingRequestType, number>
}

export interface PalletParachainStakingDelegationInfo {
  owner: string,
  amount: number
}

export interface PalletParachainStakingDelegator {
  id: string,
  delegations: PalletParachainStakingDelegationInfo[],
  total: number,
  lessTotal: number,
  status: number
}

export interface PalletStakingExposureItem {
  who: string,
  value: number
}

export interface PalletStakingExposure {
  total: number,
  own: number,
  others: PalletStakingExposureItem[]
}

export interface PalletIdentityRegistration {
  judgements: any[],
  deposit: number,
  info: {
    display: {
      Raw: string
    },
    web: {
      Raw: string
    },
    twitter: {
      Raw: string
    },
    riot: {
      Raw: string
    }
  }
}

export interface ValidatorExtraInfo {
  commission: string,
  blocked: false,
  identity?: string,
  isVerified: boolean
}

export interface Unlocking {
  remainingEras: BN;
  value: BN;
}

export interface TernoaStakingRewardsStakingRewardsData {
  sessionEraPayout: string,
  sessionExtraRewardPayout: string
}

export function parsePoolStashAddress (api: ApiPromise, index: number, poolId: number, poolsPalletId: string) {
  const ModPrefix = stringToU8a('modl');
  const U32Opts = { bitLength: 32, isLe: true };
  const EmptyH256 = new Uint8Array(32);

  return api.registry
    .createType(
      'AccountId32',
      u8aConcat(
        ModPrefix,
        poolsPalletId,
        new Uint8Array([index]),
        bnToU8a(new BN(poolId.toString()), U32Opts),
        EmptyH256
      )
    )
    .toString();
}

export function transformPoolName (input: string): string {
  return input.replace(/[^\x20-\x7E]/g, '');
}

export function parseIdentity (identityInfo: PalletIdentityRegistration | null): string | undefined {
  let identity;

  if (identityInfo) {
    const displayName = identityInfo?.info?.display?.Raw;
    const web = identityInfo?.info?.web?.Raw;
    const riot = identityInfo?.info?.riot?.Raw;
    const twitter = identityInfo?.info?.twitter?.Raw;

    if (displayName && !displayName.startsWith('0x')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      identity = displayName;
    } else {
      identity = twitter || web || riot;
    }
  }

  return identity;
}

export function getInflationParams (networkKey: string): _SubstrateInflationParams {
  return _KNOWN_CHAIN_INFLATION_PARAMS[networkKey] || _SUBSTRATE_DEFAULT_INFLATION_PARAMS;
}

export function calcInflationUniformEraPayout (totalIssuance: BN, yearlyInflationInTokens: number): number {
  const totalIssuanceInTokens = totalIssuance.div(BN_BILLION).div(BN_THOUSAND).toNumber();

  return (totalIssuanceInTokens === 0 ? 0.0 : yearlyInflationInTokens / totalIssuanceInTokens);
}

export function calcInflationRewardCurve (minInflation: number, stakedFraction: number, idealStake: number, idealInterest: number, falloff: number) {
  return (minInflation + (
    stakedFraction <= idealStake
      ? (stakedFraction * (idealInterest - (minInflation / idealStake)))
      : (((idealInterest * idealStake) - minInflation) * Math.pow(2, (idealStake - stakedFraction) / falloff))
  ));
}

export function calculateInflation (totalEraStake: BN, totalIssuance: BN, numAuctions: number, networkKey: string) {
  const inflationParams = getInflationParams(networkKey);
  const { auctionAdjust, auctionMax, falloff, maxInflation, minInflation, stakeTarget } = inflationParams;
  const idealStake = stakeTarget - (Math.min(auctionMax, numAuctions) * auctionAdjust);
  const idealInterest = maxInflation / idealStake;
  const stakedFraction = totalEraStake.mul(BN_MILLION).div(totalIssuance).toNumber() / BN_MILLION.toNumber();

  if (_STAKING_CHAIN_GROUP.aleph.includes(networkKey)) {
    if (inflationParams.yearlyInflationInTokens) {
      return 100 * calcInflationUniformEraPayout(totalIssuance, inflationParams.yearlyInflationInTokens);
    } else {
      return 100 * calcInflationRewardCurve(minInflation, stakedFraction, idealStake, idealInterest, falloff);
    }
  } else {
    return 100 * (minInflation + (
      stakedFraction <= idealStake
        ? (stakedFraction * (idealInterest - (minInflation / idealStake)))
        : (((idealInterest * idealStake) - minInflation) * Math.pow(2, (idealStake - stakedFraction) / falloff))
    ));
  }
}

export function calculateChainStakedReturn (inflation: number, totalEraStake: BN, totalIssuance: BN, networkKey: string) {
  const stakedFraction = totalEraStake.mul(BN_MILLION).div(totalIssuance).toNumber() / BN_MILLION.toNumber();

  let stakedReturn = inflation / stakedFraction;

  if (_STAKING_CHAIN_GROUP.aleph.includes(networkKey)) {
    stakedReturn *= 0.9; // 10% goes to treasury
  }

  return stakedReturn;
}

export function calculateAlephZeroValidatorReturn (chainStakedReturn: number, commission: number) {
  return chainStakedReturn * (100 - commission) / 100;
}

export function calculateTernoaValidatorReturn (rewardPerValidator: number, validatorStake: number, commission: number) {
  const percentRewardForNominators = (100 - commission) / 100;
  const rewardForNominators = rewardPerValidator * percentRewardForNominators;

  const stakeRatio = rewardForNominators / validatorStake;

  return stakeRatio * 365 * 100;
}

export function calculateValidatorStakedReturn (chainStakedReturn: number, totalValidatorStake: BN, avgStake: BN, commission: number) {
  const bnAdjusted = avgStake.mul(BN_HUNDRED).div(totalValidatorStake);
  const adjusted = bnAdjusted.toNumber() * chainStakedReturn;

  const stakedReturn = (adjusted > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : adjusted) / 100;

  return stakedReturn * (100 - commission) / 100; // Deduct commission
}

export function getCommission (commissionString: string) {
  return parseFloat(commissionString.split('%')[0]); // Example: 12%
}

export interface InflationConfig {
  expect: {
    min: string,
    ideal: string,
    max: string
  },
  annual: {
    min: string,
    ideal: string,
    max: string
  },
  round: {
    min: string,
    ideal: string,
    max: string
  }
}

export function getParaCurrentInflation (totalStaked: number, inflationConfig: InflationConfig) { // read more at https://hackmd.io/@sbAqOuXkRvyiZPOB3Ryn6Q/Sypr3ZJh5
  const expectMin = parseRawNumber(inflationConfig.expect.min);
  const expectMax = parseRawNumber(inflationConfig.expect.max);

  if (totalStaked < expectMin) {
    const inflationString = inflationConfig.annual.min.split('%')[0];

    return parseFloat(inflationString);
  } else if (totalStaked > expectMax) {
    const inflationString = inflationConfig.annual.max.split('%')[0];

    return parseFloat(inflationString);
  }

  const inflationString = inflationConfig.annual.ideal.split('%')[0];

  return parseFloat(inflationString);
}

export interface TuringOptimalCompoundFormat {
  period: string; // in days
  apy: string;
}

// validations and check conditions
export function isShowNominationByValidator (chain: string): 'showByValue' | 'showByValidator' | 'mixed' {
  if (_STAKING_CHAIN_GROUP.amplitude.includes(chain)) {
    return 'showByValue';
  } else if (_STAKING_CHAIN_GROUP.astar.includes(chain)) {
    return 'mixed';
  } else if (_STAKING_CHAIN_GROUP.para.includes(chain)) {
    return 'showByValidator';
  }

  return 'showByValue';
}

export function getBondedValidators (nominations: NominationInfo[]) {
  const bondedValidators: string[] = [];
  let nominationCount = 0;

  for (const nomination of nominations) {
    nominationCount += 1;
    bondedValidators.push(reformatAddress(nomination.validatorAddress, 0));
  }

  return {
    nominationCount,
    bondedValidators
  };
}

export function isUnstakeAll (selectedValidator: string, nominations: NominationInfo[], unstakeAmount: string) {
  let isUnstakeAll = false;

  for (const nomination of nominations) {
    const parsedValidatorAddress = reformatAddress(nomination.validatorAddress, 0);
    const parsedSelectedValidator = reformatAddress(selectedValidator, 0);

    if (parsedValidatorAddress === parsedSelectedValidator) {
      if (unstakeAmount === nomination.activeStake) {
        isUnstakeAll = true;
      }

      break;
    }
  }

  return isUnstakeAll;
}

export enum StakingAction {
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  WITHDRAW = 'WITHDRAW',
  CLAIM_REWARD = 'CLAIM_REWARD',
  CANCEL_UNSTAKE = 'CANCEL_UNSTAKE'
}

export function getStakingAvailableActionsByChain (chain: string, type: StakingType): StakingAction[] {
  if (type === StakingType.POOLED) {
    return [StakingAction.STAKE, StakingAction.UNSTAKE, StakingAction.WITHDRAW, StakingAction.CLAIM_REWARD];
  }

  if (_STAKING_CHAIN_GROUP.para.includes(chain)) {
    return [StakingAction.STAKE, StakingAction.UNSTAKE, StakingAction.WITHDRAW, StakingAction.CANCEL_UNSTAKE];
  } else if (_STAKING_CHAIN_GROUP.astar.includes(chain)) {
    return [StakingAction.STAKE, StakingAction.UNSTAKE, StakingAction.WITHDRAW, StakingAction.CLAIM_REWARD];
  } else if (_STAKING_CHAIN_GROUP.amplitude.includes(chain)) {
    return [StakingAction.STAKE, StakingAction.UNSTAKE, StakingAction.WITHDRAW];
  }

  return [StakingAction.STAKE, StakingAction.UNSTAKE, StakingAction.WITHDRAW, StakingAction.CANCEL_UNSTAKE];
}

export function getStakingAvailableActionsByNominator (nominatorMetadata: NominatorMetadata, unclaimedReward?: string): StakingAction[] {
  const result: StakingAction[] = [StakingAction.STAKE];

  const bnActiveStake = new BN(nominatorMetadata.activeStake);

  if (nominatorMetadata.activeStake && bnActiveStake.gt(BN_ZERO)) {
    result.push(StakingAction.UNSTAKE);

    const isAstarNetwork = _STAKING_CHAIN_GROUP.astar.includes(nominatorMetadata.chain);
    const isAmplitudeNetwork = _STAKING_CHAIN_GROUP.amplitude.includes(nominatorMetadata.chain);
    const bnUnclaimedReward = new BN(unclaimedReward || '0');

    if (
      ((nominatorMetadata.type === StakingType.POOLED || isAmplitudeNetwork) && bnUnclaimedReward.gt(BN_ZERO)) ||
      isAstarNetwork
    ) {
      result.push(StakingAction.CLAIM_REWARD);
    }
  }

  if (nominatorMetadata.unstakings.length > 0) {
    result.push(StakingAction.CANCEL_UNSTAKE);
    const hasClaimable = nominatorMetadata.unstakings.some((unstaking) => unstaking.status === UnstakingStatus.CLAIMABLE);

    if (hasClaimable) {
      result.push(StakingAction.WITHDRAW);
    }
  }

  return result;
}

export function isActionFromValidator (stakingType: StakingType, chain: string) {
  if (stakingType === StakingType.POOLED) {
    return false;
  }

  if (_STAKING_CHAIN_GROUP.astar.includes(chain)) {
    return true;
  } else if (_STAKING_CHAIN_GROUP.amplitude.includes(chain)) {
    return true;
  } else if (_STAKING_CHAIN_GROUP.para.includes(chain)) {
    return true;
  }

  return false;
}

export function getWithdrawalInfo (nominatorMetadata: NominatorMetadata) {
  const unstakings = nominatorMetadata.unstakings;

  let result: UnstakingInfo | undefined;

  if (_STAKING_CHAIN_GROUP.astar.includes(nominatorMetadata.chain)) {
    return getAstarWithdrawable(nominatorMetadata);
  }

  for (const unstaking of unstakings) {
    if (unstaking.status === UnstakingStatus.CLAIMABLE) {
      result = unstaking; // only get the first withdrawal
      break;
    }
  }

  return result;
}

export function getStakingStatusByNominations (bnTotalActiveStake: BN, nominationList: NominationInfo[]): StakingStatus {
  let stakingStatus: StakingStatus = StakingStatus.EARNING_REWARD;

  if (bnTotalActiveStake.isZero()) {
    stakingStatus = StakingStatus.NOT_EARNING;
  } else {
    let invalidDelegationCount = 0;

    for (const nomination of nominationList) {
      if (nomination.status === StakingStatus.NOT_EARNING) {
        invalidDelegationCount += 1;
      }
    }

    if (invalidDelegationCount > 0 && invalidDelegationCount < nominationList.length) {
      stakingStatus = StakingStatus.PARTIALLY_EARNING;
    } else if (invalidDelegationCount === nominationList.length) {
      stakingStatus = StakingStatus.NOT_EARNING;
    }
  }

  return stakingStatus;
}

export function getValidatorLabel (chain: string) {
  if (_STAKING_CHAIN_GROUP.astar.includes(chain)) {
    return 'dApp';
  } else if (_STAKING_CHAIN_GROUP.relay.includes(chain)) {
    return 'Validator';
  }

  return 'Collator';
}

export const getMinStakeErrorMessage = (chainInfo: _ChainInfo, bnMinStake: BN): string => {
  const tokenInfo = _getChainNativeTokenBasicInfo(chainInfo);
  const number = formatNumber(bnMinStake.toString(), tokenInfo.decimals || 0, balanceFormatter);

  return t('Insufficient stake. Please stake at least {{number}} {{tokenSymbol}} to get rewards', { replace: { tokenSymbol: tokenInfo.symbol, number } });
};

export const getMaxValidatorErrorMessage = (chainInfo: _ChainInfo, max: number): string => {
  let message = detectTranslate('You cannot select more than {{number}} validators for this network');
  const label = getValidatorLabel(chainInfo.slug);

  if (max > 1) {
    switch (label) {
      case 'dApp':
        message = detectTranslate('You cannot select more than {{number}} dApps for this network');
        break;
      case 'Collator':
        message = detectTranslate('You cannot select more than {{number}} collators for this network');
        break;
      case 'Validator':
        message = detectTranslate('You cannot select more than {{number}} validators for this network');
        break;
    }
  } else {
    switch (label) {
      case 'dApp':
        message = detectTranslate('You cannot select more than {{number}} dApp for this network');
        break;
      case 'Collator':
        message = detectTranslate('You cannot select more than {{number}} collator for this network');
        break;
      case 'Validator':
        message = detectTranslate('You cannot select more than {{number}} validator for this network');
        break;
    }
  }

  return t(message, { replace: { number: max } });
};

export const getExistUnstakeErrorMessage = (chain: string, isStakeMore?: boolean): string => {
  const label = getValidatorLabel(chain);

  if (!isStakeMore) {
    switch (label) {
      case 'dApp':
        return t('You can unstake from a dApp once');
      case 'Collator':
        return t('You can unstake from a collator once');
      case 'Validator':
        return t('You can unstake from a validator once');
    }
  } else {
    switch (label) {
      case 'dApp':
        return t('You cannot stake more for a dApp you are unstaking from');
      case 'Collator':
        return t('You cannot stake more for a collator you are unstaking from');
      case 'Validator':
        return t('You cannot stake more for a validator you are unstaking from');
    }
  }
};
