import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import dotenv from "dotenv";
import { Anthropic } from "@anthropic-ai/sdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

dotenv.config();

const AGENT_MNEMONIC = process.env.AGENT_MNEMONIC;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
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

server.tool("showAssets", "Show all assets", async () => {
  // Mock data for demonstration
  const assets = [
    {
      id: 123,
      name: "CoolToken",
      balance: 100,
    },
    {
      id: 456,
      name: "SuperCoin",
      balance: 50,
    },
  ];

  return {
    content: [
      {
        type: "text",
        text: `Available assets:\n${assets
          .map((asset) => `- Asset ID: ${asset.id}\n  Name: ${asset.name}\n  Balance: ${asset.balance}`)
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
    sender: z.number().int().nonnegative().describe("Sender account ID"),
    offerPrice: z.number().int().nonnegative().describe("Negotiated price amount"),
    listingAppID: z.number().int().nonnegative().describe("Listing application ID"),
    rekeyBack: z.boolean().describe("Whether to rekey back after the transaction"),
  },
  async ({ sender, offerPrice, listingAppID, rekeyBack }) => {
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
    sender: z.number().int().nonnegative().describe("Sender account ID"),
    rekeyBack: z.boolean().describe("Whether to rekey back after the transaction"),
    listingAppID: z.number().int().nonnegative().describe("Listing application ID"),
  },
  async ({ sender, rekeyBack, listingAppID }) => {
    // Implementation will be added later
    return {
      content: [
        {
          type: "text",
          text: `Purchasing from listing ${listingAppID} by sender ${sender} (rekeyBack: ${rekeyBack})`,
        },
      ],
    };
  }
);

server.tool(
  "delistAsset",
  "Remove a listing from sale",
  {
    sender: z.number().int().nonnegative().describe("Sender account ID"),
    rekeyBack: z.boolean().describe("Whether to rekey back after the transaction"),
    listingAppID: z.number().int().nonnegative().describe("Listing application ID"),
  },
  async ({ sender, rekeyBack, listingAppID }) => {
    // Implementation will be added later
    return {
      content: [
        {
          type: "text",
          text: `Delisting listing ${listingAppID} by sender ${sender} (rekeyBack: ${rekeyBack})`,
        },
      ],
    };
  }
);

export default server;
