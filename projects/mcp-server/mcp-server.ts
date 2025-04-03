import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

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
    // Implementation will be added later
    return {
      content: [
        {
          type: "text",
          text: `Negotiating price of ${offerPrice} for listing ${listingAppID} by sender ${sender} (rekeyBack: ${rekeyBack})`,
        },
      ],
    };
  }
);

server.tool(
  "recordNegotiatedPrice",
  "Record a negotiated price for a listing",
  {
    sender: z.number().int().nonnegative().describe("Sender account ID"),
    price: z.number().int().nonnegative().describe("Negotiated price amount"),
    factoryID: z.number().int().nonnegative().describe("Factory application ID"),
    listingAppID: z.number().int().nonnegative().describe("Listing application ID"),
    rekeyBack: z.boolean().describe("Whether to rekey back after the transaction"),
  },
  async ({ sender, price, factoryID, listingAppID, rekeyBack }) => {
    // Implementation will be added later
    return {
      content: [
        {
          type: "text",
          text: `Recording negotiated price of ${price} for listing ${listingAppID} from factory ${factoryID} by sender ${sender} (rekeyBack: ${rekeyBack})`,
        },
      ],
    };
  }
);

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
