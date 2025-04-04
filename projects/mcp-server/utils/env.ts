import dotenv from "dotenv";

dotenv.config();

export function getListingFactoryIDFromEnvironment(): bigint {
  if (!process.env.LISTING_FACTORY_ID!) {
    throw new Error("Attempt to get Listing Factory ID without specifying LISTING_FACTORY_ID in the environment variables");
  }

  return BigInt(process.env.LISTING_FACTORY_ID!);
}

export function getOptinPluginIDFromEnvironment(): bigint {
  if (!process.env.OPTIN_PLUGIN_ID!) {
    throw new Error("Attempt to get Optin Plugin ID without specifying OPTIN_PLUGIN_ID in the environment variables");
  }

  return BigInt(process.env.OPTIN_PLUGIN_ID!);
}

export function getMarketplacePluginIDFromEnvironment(): bigint {
  if (!process.env.MARKETPLACE_PLUGIN_ID!) {
    throw new Error("Attempt to get Marketplace Plugin ID without specifying MARKETPLACE_PLUGIN_ID in the environment variables");
  }

  return BigInt(process.env.MARKETPLACE_PLUGIN_ID!);
}

export function getAgentAddressFromEnvironment(): string {
  if (!process.env.AGENT_ADDRESS!) {
    throw new Error("Attempt to get Agent Address without specifying AGENT_ADDRESS in the environment variables");
  }

  return process.env.AGENT_ADDRESS!;
}
