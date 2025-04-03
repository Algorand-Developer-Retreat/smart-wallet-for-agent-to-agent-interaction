import algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromEnvironment } from './network/getAlgoClientConfigs'
import { AbstractedAccountClient, AbstractedAccountFactory } from '@/contracts/AbstractedAccount'
import { getMarketplacePluginIDFromEnvironment } from './env'
import { MarketplacePluginClient } from '@/contracts/MarketplacePlugin'

const algodConfig = getAlgodConfigFromEnvironment()
const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200)

const MARKETPLACE_PLUGIN_ID = getMarketplacePluginIDFromEnvironment()

export interface GetAbstractedAccountFactoryParams {
    defaultSender?: string | algosdk.Address | undefined
    defaultSigner?: algosdk.TransactionSigner | undefined
}

export function GetAbstractedAccountFactory({
    defaultSender,
    defaultSigner,
}: GetAbstractedAccountFactoryParams): AbstractedAccountFactory {
    return new AbstractedAccountFactory({
        defaultSender,
        defaultSigner,
        algorand: algorand,
    })
}

export interface GetAbstractAccountClientParams {
    signer: algosdk.TransactionSigner
    activeAddress: string
    appId?: bigint
}

export async function getAbstractAccountClient({ activeAddress, signer, appId = 0n }: GetAbstractAccountClientParams): Promise<AbstractedAccountClient> {
    algorand.setSigner(activeAddress, signer)
    return algorand.client.getTypedAppClientById(AbstractedAccountClient, {
        defaultSender: activeAddress,
        appId: appId,
    })
}

export interface GetAgentClientParams {
    signer: algosdk.TransactionSigner
    activeAddress: string
}

export async function getMarketplacePluginClient({ activeAddress, signer }: GetAgentClientParams): Promise<MarketplacePluginClient> {
    algorand.setSigner(activeAddress, signer)
    return algorand.client.getTypedAppClientById(MarketplacePluginClient, {
        defaultSender: activeAddress,
        appId: MARKETPLACE_PLUGIN_ID,
    })
}