import { NetworkId } from "@txnlab/use-wallet-react"
import { getAlgodConfigFromEnvironment } from "./getAlgoClientConfigs"

export function getAlgodNetwork(): NetworkId {
    const config = getAlgodConfigFromEnvironment()
  
    switch (config.network) {
      case 'mainnet':
        return NetworkId.MAINNET
      case 'testnet':
        return NetworkId.TESTNET
      case 'betanet':
        return NetworkId.BETANET
      case 'fnet':
        return NetworkId.FNET
      case 'localnet':
        return NetworkId.LOCALNET
      default:
        throw new Error(`Unknown network: ${config.network}`)
    }
  }
  