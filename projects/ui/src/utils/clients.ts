import algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromEnvironment } from './network/getAlgoClientConfigs'
import { AbstractedAccountClient, AbstractedAccountFactory } from '@/contracts/AbstractedAccountClient'
import { OptInPluginClient } from '@/contracts/OptInPluginClient'
import { getMarketplacePluginIDFromEnvironment, getOptinPluginIDFromEnvironment } from './env'
import { MarketplacePluginClient } from '@/contracts/MarketplacePlugin'

const algodConfig = getAlgodConfigFromEnvironment()
const algorandClient = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200)

const OPTIN_PLUGIN_ID = getOptinPluginIDFromEnvironment()
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
        algorand: algorandClient,
    })
}

export interface GetAbstractAccountClientParams {
    signer: algosdk.TransactionSigner
    activeAddress: string
    appId?: bigint
}

export async function getAbstractAccountClient({ activeAddress, signer, appId = 0n }: GetAbstractAccountClientParams): Promise<AbstractedAccountClient> {
    algorandClient.setSigner(activeAddress, signer)
    return algorandClient.client.getTypedAppClientById(AbstractedAccountClient, {
        defaultSender: activeAddress,
        appId: appId,
    })
}

export interface GetOptinClientParams {
    signer: algosdk.TransactionSigner
    activeAddress: string
}

export async function getOptinClient({ activeAddress, signer }: GetOptinClientParams): Promise<OptInPluginClient> {
    algorandClient.setSigner(activeAddress, signer)
    return algorandClient.client.getTypedAppClientById(OptInPluginClient, {
        defaultSender: activeAddress,
        appId: OPTIN_PLUGIN_ID,
    })
}

export interface GetAgentClientParams {
    signer: algosdk.TransactionSigner
    activeAddress: string
}

export async function getMarketplacePluginClient({ activeAddress, signer }: GetAgentClientParams): Promise<MarketplacePluginClient> {
    algorandClient.setSigner(activeAddress, signer)
    return algorandClient.client.getTypedAppClientById(MarketplacePluginClient, {
        defaultSender: activeAddress,
        appId: MARKETPLACE_PLUGIN_ID,
    })
}