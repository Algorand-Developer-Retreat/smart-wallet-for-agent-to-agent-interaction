import algosdk from "algosdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { getAlgodConfigFromEnvironment } from "./network/getAlgoClientConfigs.js";
import { AbstractedAccountClient, AbstractedAccountFactory } from "../contracts/AbstractedAccount.js";
import { getMarketplacePluginIDFromEnvironment, getOptinPluginIDFromEnvironment } from "./env.js";
import { MarketplacePluginClient } from "../contracts/MarketplacePlugin.js";
import { OptInPluginClient } from "../contracts/OptInPlugin.js";

const algodConfig = getAlgodConfigFromEnvironment();
const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200);

const OPTIN_PLUGIN_ID = getOptinPluginIDFromEnvironment();
const MARKETPLACE_PLUGIN_ID = getMarketplacePluginIDFromEnvironment();

export interface GetAbstractedAccountFactoryParams {
  defaultSender?: string | algosdk.Address | undefined;
  defaultSigner?: algosdk.TransactionSigner | undefined;
}

export function GetAbstractedAccountFactory({ defaultSender, defaultSigner }: GetAbstractedAccountFactoryParams): AbstractedAccountFactory {
  return new AbstractedAccountFactory({
    defaultSender,
    defaultSigner,
    algorand: algorand,
  });
}

export interface GetAbstractAccountClientParams {
  signer: algosdk.TransactionSigner;
  activeAddress: string;
  appId?: bigint;
}

export async function getAbstractAccountClient({
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

export interface GetOptinPluginClientParams {
  signer: algosdk.TransactionSigner;
  activeAddress: string;
}

export async function getOptinPluginClient({ activeAddress, signer }: GetOptinPluginClientParams): Promise<OptInPluginClient> {
  algorand.setSigner(activeAddress, signer);
  return algorand.client.getTypedAppClientById(OptInPluginClient, {
    defaultSender: activeAddress,
    appId: OPTIN_PLUGIN_ID,
  });
}

export interface GetAgentClientParams {
  signer: algosdk.TransactionSigner;
  activeAddress: string;
}

export async function getMarketplacePluginClient({ activeAddress, signer }: GetAgentClientParams): Promise<MarketplacePluginClient> {
  algorand.setSigner(activeAddress, signer);
  return algorand.client.getTypedAppClientById(MarketplacePluginClient, {
    defaultSender: activeAddress,
    appId: MARKETPLACE_PLUGIN_ID,
  });
}
