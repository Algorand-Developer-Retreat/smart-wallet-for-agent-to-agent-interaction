import algosdk from "algosdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { getAlgodConfigFromEnvironment } from "./network/getAlgoClientConfigs.js";
import { AbstractedAccountClient, AbstractedAccountFactory } from "../contracts/AbstractedAccount.js";
import { getListingFactoryIDFromEnvironment, getMarketplacePluginIDFromEnvironment, getOptinPluginIDFromEnvironment } from "./env.js";
import { MarketplacePluginClient } from "../contracts/MarketplacePlugin.js";
import { OptInPluginClient } from "../contracts/OptInPlugin.js";
import { ListingFactoryClient } from "../contracts/ListingFactory.js";
import dotenv from "dotenv";

dotenv.config();

const FEE_SINK = 'A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE'

const algorand = AlgorandClient.defaultLocalNet().setDefaultValidityWindow(200);

const OPTIN_PLUGIN_ID = getOptinPluginIDFromEnvironment();
const MARKETPLACE_PLUGIN_ID = getMarketplacePluginIDFromEnvironment();
const LISTING_FACTORY_ID = getListingFactoryIDFromEnvironment()

interface GetAbstractedAccountFactoryParams {
  defaultSender?: string | algosdk.Address | undefined;
  defaultSigner?: algosdk.TransactionSigner | undefined;
}

function GetAbstractedAccountFactory({ defaultSender, defaultSigner }: GetAbstractedAccountFactoryParams): AbstractedAccountFactory {
  return new AbstractedAccountFactory({
    defaultSender,
    defaultSigner,
    algorand: algorand,
  });
}

interface GetAbstractAccountClientParams {
  signer: algosdk.TransactionSigner;
  activeAddress: string;
  appId?: bigint;
}

async function getAbstractAccountClient({
  activeAddress,
  signer,
  appId = 0n,
}: GetAbstractAccountClientParams): Promise<AbstractedAccountClient> {
  algorand.setSigner(activeAddress, signer);
  return algorand.client.getTypedAppClientById(AbstractedAccountClient, {
    defaultSender: activeAddress,
    appId: appId,
  });
}

interface GetOptinPluginClientParams {
  signer: algosdk.TransactionSigner;
  activeAddress: string;
}

async function getOptinPluginClient({ activeAddress, signer }: GetOptinPluginClientParams): Promise<OptInPluginClient> {
  algorand.setSigner(activeAddress, signer);
  return algorand.client.getTypedAppClientById(OptInPluginClient, {
    defaultSender: activeAddress,
    appId: OPTIN_PLUGIN_ID,
  });
}

interface GetAgentClientParams {
  signer: algosdk.TransactionSigner;
  activeAddress: string;
}

async function getMarketplacePluginClient({ activeAddress, signer }: GetAgentClientParams): Promise<MarketplacePluginClient> {
  algorand.setSigner(activeAddress, signer);
  return algorand.client.getTypedAppClientById(MarketplacePluginClient, {
    defaultSender: activeAddress,
    appId: MARKETPLACE_PLUGIN_ID,
  });
}

async function getListingFactoryClient(activeAddress = FEE_SINK): Promise<ListingFactoryClient> {
  return algorand.client.getTypedAppClientById(ListingFactoryClient, {
      defaultSender: activeAddress,
      appId: LISTING_FACTORY_ID,
  })
}