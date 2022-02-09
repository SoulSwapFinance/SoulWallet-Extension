import {useSelector} from "react-redux";
import {RootState} from "@polkadot/extension-koni-ui/stores";
import {NetWorkMetadataDef} from "@polkadot/extension-base/background/KoniTypes";

function getCrowdloadNetworksMap(source: Record<string, NetWorkMetadataDef>): Record<string, string[]> {
  const result:Record<string, string[]> = {};

  result.all = [];
  result.polkadot = [];
  result.kusama = [];

  for (let networkKey in source) {
    if (!source.hasOwnProperty(networkKey)) {
      continue;
    }

    const networkInfo = source[networkKey];

    if (networkInfo.paraId == undefined) {
      continue;
    }

    result.all.push(networkKey);

    if (networkInfo.group === 'POLKADOT_PARACHAIN') {
      result.polkadot.push(networkKey);
    } else if (networkInfo.group === 'KUSAMA_PARACHAIN') {
      result.kusama.push(networkKey);
    }
  }

  return result;
}

function getCrowdloanNetworks(networkMetadata: Record<string, NetWorkMetadataDef>, currentNetworkKey: string): string[] {
  const crowdloadNetworksMap = getCrowdloadNetworksMap(networkMetadata);

  if (currentNetworkKey === 'all') {
    return [...crowdloadNetworksMap['all']];
  }

  if (currentNetworkKey === 'polkadot') {
    return [...crowdloadNetworksMap['polkadot']];
  }

  if (currentNetworkKey === 'kusama') {
    return [...crowdloadNetworksMap['kusama']];
  }

  return [currentNetworkKey]
}

export default function useCrowdloanNetworks(currentNetworkKey: string): string[] {
  const networkMetadata = useSelector((state: RootState) => state.networkMetadata);

  return getCrowdloanNetworks(networkMetadata, currentNetworkKey);
}