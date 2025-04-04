import { AlgodClientConfig, AlgoKMDConfig } from "../../interfaces/network.js";

export function getAlgodConfigFromEnvironment(): AlgodClientConfig {
  if (!process.env.ALGOD_SERVER) {
    throw new Error("Attempt to get default algod configuration without specifying ALGOD_SERVER in the environment variables");
  }

  return {
    server: process.env.ALGOD_SERVER,
    port: Number(process.env.ALGOD_PORT),
    token: process.env.ALGOD_TOKEN!,
    network: process.env.ALGOD_NETWORK!,
  };
}

export function getBackendAlgodConfigFromEnvironment(): AlgodClientConfig {
  if (!process.env.ALGOD_SERVER) {
    throw new Error("Attempt to get default algod configuration without specifying ALGOD_SERVER in the environment variables");
  }

  return {
    server: process.env.ALGOD_SERVER,
    port: Number(process.env.ALGOD_PORT),
    token: process.env.NODELY_BACKEND_ALGOD_TOKEN! || "",
    network: process.env.ALGOD_NETWORK! || "",
  };
}

export function getIndexerConfigFromEnvironment(): AlgodClientConfig {
  if (!process.env.INDEXER_SERVER) {
    throw new Error("Attempt to get default algod configuration without specifying INDEXER_SERVER in the environment variables");
  }

  return {
    server: process.env.INDEXER_SERVER,
    port: Number(process.env.INDEXER_PORT),
    token: process.env.INDEXER_TOKEN!,
    network: process.env.ALGOD_NETWORK!,
  };
}

export function getKmdConfigFromEnvironment(): AlgoKMDConfig {
  return {
    server: process.env.KMD_SERVER!,
    port: Number(process.env.KMD_PORT),
    token: process.env.KMD_TOKEN!,
    wallet: process.env.KMD_WALLET!,
    password: process.env.KMD_PASSWORD!,
  };
}
