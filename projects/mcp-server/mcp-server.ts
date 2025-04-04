import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import dotenv from "dotenv";
import { Anthropic } from "@anthropic-ai/sdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";
import { AbstractedAccountClient, AbstractedAccountFactory } from "./contracts/AbstractedAccount.js";
import { MarketplacePluginClient } from "./contracts/MarketplacePlugin.js";
import { OptInPluginClient } from "./contracts/OptInPlugin.js";
import { ListingFactoryClient } from "./contracts/ListingFactory.js";
import { ListingClient, ListingInfo } from "./contracts/Listing.js";

dotenv.config();

export const FEE_SINK = "A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE";

const algorand = AlgorandClient.defaultLocalNet().setDefaultValidityWindow(200);

const LISTING_FACTORY_ID = BigInt(process.env.LISTING_FACTORY_ID!);
if (!LISTING_FACTORY_ID) {
  console.error("LISTING_FACTORY_ID is not set");
}

const OPTIN_PLUGIN_ID = BigInt(process.env.OPTIN_PLUGIN_ID!);
if (!OPTIN_PLUGIN_ID) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const MARKETPLACE_PLUGIN_ID = BigInt(process.env.MARKETPLACE_PLUGIN_ID!);
if (!MARKETPLACE_PLUGIN_ID) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const AGENT_MNEMONIC = process.env.AGENT_MNEMONIC;
if (!AGENT_MNEMONIC) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const SELLER_WALLET_APP_ID = BigInt(process.env.SELLER_SMART_WALLET_APP_ID!);
if (!SELLER_WALLET_APP_ID) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

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

export async function getListingFactoryClient(activeAddress = FEE_SINK): Promise<ListingFactoryClient> {
  return algorand.client.getTypedAppClientById(ListingFactoryClient, {
    defaultSender: activeAddress,
    appId: LISTING_FACTORY_ID,
  });
}

const listingFactoryClient = await getListingFactoryClient();

async function getAllListings(): Promise<ListingInfo[]> {
  const response = await algorand.client.algod.accountInformation(listingFactoryClient.appAddress).do();

  if (response.createdApps === undefined || response.createdApps?.length === 0) {
    return [];
  }

  return await Promise.all(
    response.createdApps.map(async (app) => {
      const listingClient = await algorand.client.getTypedAppClientById(ListingClient, { appId: app.id });
      return await listingClient.getInfo();
    })
  );
}

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

function getAgentAccount() {
  if (!AGENT_MNEMONIC) {
    throw new Error("AGENT_MNEMONIC is not set");
  }

  const algorand = AlgorandClient.defaultLocalNet();
  const agentAccount = algorand.account.fromMnemonic(AGENT_MNEMONIC);

  return agentAccount;
}

server.tool("showListings", "Show all asset listings", async () => {
  const listings = await getAllListings();

  return {
    content: [
      {
        type: "text",
        text: `Available listings:\n${listings
          .map(
            (asset) =>
              `- Listing ID: ${asset.id} Asset ID: ${asset.assetId}\n  Name: ${asset.name}\n  UnitName: ${asset.unitName}\n  Decimals: ${asset.decimals}\n  Seller: ${asset.seller}`
          )
          .join("\n\n")}`,
      },
    ],
  };
});

server.tool(
  "listAsset",
  "List an asset for sale with specified parameters",
  {
    sender: z.number().int().nonnegative().describe("Sender account ID"),
    rekeyBack: z.boolean().describe("Whether to rekey back after the transaction"),
    asset: z.number().int().nonnegative().describe("Asset ID to list"),
    assetAmount: z.number().int().nonnegative().describe("Amount of asset to list"),
    minimumPriceToAccept: z.number().int().nonnegative().describe("Minimum price to accept for the asset"),
  },
  async ({ sender, rekeyBack, asset, assetAmount, minimumPriceToAccept }) => {
    // Implementation will be added later
    return {
      content: [
        {
          type: "text",
          text: `Listing ${assetAmount} units of asset ${asset} for minimum price of ${minimumPriceToAccept} by sender ${sender} (rekeyBack: ${rekeyBack})`,
        },
      ],
    };
  }
);

server.tool(
  "negotiatePrice",
  "Negotiate a price for a listing",
  {
    offerPrice: z.number().int().nonnegative().describe("Negotiated price amount"),
    listingAppID: z.number().int().nonnegative().describe("Listing application ID"),
  },
  async ({ offerPrice, listingAppID }) => {
    // Use Claude to negotiate the price as a seller
    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a smart negotiator representing a seller. The buyer has offered ${offerPrice} tokens.
        Your goal is to maximize profit while being reasonable. The listing ID is ${listingAppID}.
        Respond only with a number representing your counter-offer. If you accept the offer, return the same number.
        Consider market dynamics and be strategic but fair.`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const counterOffer = parseInt(responseText.trim());

    if (isNaN(counterOffer)) {
      throw new Error("Failed to get a valid counter-offer from the negotiator");
    }

    const isAccepted = counterOffer === offerPrice;
    const status = isAccepted ? "ACCEPTED" : "COUNTER-OFFER";

    if (status === "ACCEPTED") {
      const agentAccount = getAgentAccount();
      const marketPlacePluginClient = await getMarketplacePluginClient({
        activeAddress: agentAccount.addr.toString(),
        signer: agentAccount.signer,
      });
      const abstractedAccountClient = await getAbstractAccountClient({
        activeAddress: agentAccount.addr.toString(),
        signer: agentAccount.signer,
        appId: SELLER_WALLET_APP_ID,
      });

      const recordNegotiatedPriceCall = (
        await marketPlacePluginClient.createTransaction.recordNegotiatedPrice({
          sender: agentAccount,
          signer: agentAccount.signer,
          args: {
            sender: abstractedAccountClient.appId,
            rekeyBack: true,
            price: offerPrice,
            listingAppId: listingAppID!,
          },
          extraFee: (1000).microAlgos(),
        })
      ).transactions[0];

      try {
        const recordPriceResult = await abstractedAccountClient
          .newGroup()
          .arc58RekeyToPlugin({
            sender: agentAccount,
            signer: agentAccount.signer,
            args: {
              plugin: marketPlacePluginClient.appId,
              methodOffsets: [],
            },
            extraFee: (1000).microAlgos(),
          })
          .addTransaction(recordNegotiatedPriceCall, agentAccount.signer) // list asset
          .arc58VerifyAuthAddr({
            sender: agentAccount,
            signer: agentAccount.signer,
            args: {},
          })
          .send();

        console.log("accepted 10,000 price, txId", recordPriceResult.txIds);
      } catch (e: any) {
        console.log(`Error: ${e}`);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `${status}: ${counterOffer} for listing ${listingAppID} (Original offer: ${offerPrice})`,
        },
      ],
    };
  }
);

// server.tool(
//   "recordNegotiatedPrice",
//   "Record a negotiated price for a listing",
//   {
//     sender: z.number().int().nonnegative().describe("Sender account ID"),
//     price: z.number().int().nonnegative().describe("Negotiated price amount"),
//     factoryID: z.number().int().nonnegative().describe("Factory application ID"),
//     listingAppID: z.number().int().nonnegative().describe("Listing application ID"),
//     rekeyBack: z.boolean().describe("Whether to rekey back after the transaction"),
//   },
//   async ({ sender, price, factoryID, listingAppID, rekeyBack }) => {
//     // Implementation will be added later
//     return {
//       content: [
//         {
//           type: "text",
//           text: `Recording negotiated price of ${price} for listing ${listingAppID} from factory ${factoryID} by sender ${sender} (rekeyBack: ${rekeyBack})`,
//         },
//       ],
//     };
//   }
// );

server.tool(
  "purchaseAsset",
  "Purchase an asset from a listing",
  {
    sender: z.number().nonnegative().describe("Buyer Wallet App ID"),
    listingAppID: z.number().int().nonnegative().describe("Listing application ID"),
  },
  async ({ sender, listingAppID }) => {
    const agentAccount = getAgentAccount();
    const marketPlacePluginClient = await getMarketplacePluginClient({
      activeAddress: agentAccount.addr.toString(),
      signer: agentAccount.signer,
    });
    const abstractedAccountClient = await getAbstractAccountClient({
      activeAddress: agentAccount.addr.toString(),
      signer: agentAccount.signer,
      appId: BigInt(sender),
    });
    const purchaseCall = (
      await marketPlacePluginClient.createTransaction.purchase({
        sender: agentAccount.addr,
        signer: agentAccount.signer,
        args: {
          sender: abstractedAccountClient.appId,
          rekeyBack: true,
          listingAppId: listingAppID!,
        },
        extraFee: (8000).microAlgos(),
      })
    ).transactions[0];

    try {
      const purchaseResult = await abstractedAccountClient
        .newGroup()
        .arc58RekeyToPlugin({
          sender: agentAccount.addr,
          signer: agentAccount.signer,
          args: {
            plugin: marketPlacePluginClient.appId,
            methodOffsets: [],
          },
          extraFee: (1000).microAlgos(),
        })
        .addTransaction(purchaseCall, agentAccount.signer) // list asset
        .arc58VerifyAuthAddr({
          sender: agentAccount.addr,
          signer: agentAccount.signer,
          args: {},
        })
        .send();

      console.log("purchased NFT, txId", purchaseResult.txIds);
    } catch (e: any) {
      console.log(`Error: ${e}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `Purchasing from listing ${listingAppID} by sender ${sender}`,
        },
      ],
    };
  }
);

// server.tool(
//   "delistAsset",
//   "Remove a listing from sale",
//   {
//     sender: z.number().int().nonnegative().describe("Sender account ID"),
//     rekeyBack: z.boolean().describe("Whether to rekey back after the transaction"),
//     listingAppID: z.number().int().nonnegative().describe("Listing application ID"),
//   },
//   async ({ sender, rekeyBack, listingAppID }) => {
//     // Implementation will be added later
//     return {
//       content: [
//         {
//           type: "text",
//           text: `Delisting listing ${listingAppID} by sender ${sender} (rekeyBack: ${rekeyBack})`,
//         },
//       ],
//     };
//   }
// );

export default server;
