import algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromEnvironment } from './network/getAlgoClientConfigs'
import { AbstractedAccountClient, AbstractedAccountFactory } from '@/contracts/AbstractedAccount'
import { getListingFactoryIDFromEnvironment, getMarketplacePluginIDFromEnvironment, getOptinPluginIDFromEnvironment } from './env'
import { MarketplacePluginClient } from '@/contracts/MarketplacePlugin'
import { OptInPluginClient } from '@/contracts/OptInPlugin'
import { ListingFactoryClient } from '@/contracts/ListingFactory'

export const FEE_SINK = 'A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE'

const algodConfig = getAlgodConfigFromEnvironment()
const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200)

const OPTIN_PLUGIN_ID = getOptinPluginIDFromEnvironment()
const MARKETPLACE_PLUGIN_ID = getMarketplacePluginIDFromEnvironment()
const LISTING_FACTORY_ID = getListingFactoryIDFromEnvironment()

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

export interface GetClientParams {
    signer: algosdk.TransactionSigner
    activeAddress: string
}

export async function getOptinPluginClient({ activeAddress, signer }: GetClientParams): Promise<OptInPluginClient> {
    algorand.setSigner(activeAddress, signer)
    return algorand.client.getTypedAppClientById(OptInPluginClient, {
        defaultSender: activeAddress,
        appId: OPTIN_PLUGIN_ID,
    })
}

export interface GetAgentClientParams {
    signer: algosdk.TransactionSigner
    activeAddress: string
}

export async function getMarketplacePluginClient({ activeAddress, signer }: GetClientParams): Promise<MarketplacePluginClient> {
    algorand.setSigner(activeAddress, signer)
    return algorand.client.getTypedAppClientById(MarketplacePluginClient, {
        defaultSender: activeAddress,
        appId: MARKETPLACE_PLUGIN_ID,
    })
}

export async function getListingFactoryClient(activeAddress = FEE_SINK): Promise<ListingFactoryClient> {
    return algorand.client.getTypedAppClientById(ListingFactoryClient, {
        defaultSender: activeAddress,
        appId: LISTING_FACTORY_ID,
    })
}