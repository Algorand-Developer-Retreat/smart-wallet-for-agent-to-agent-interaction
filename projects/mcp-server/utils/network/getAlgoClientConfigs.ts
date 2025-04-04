import { AlgodClientConfig, AlgoKMDConfig } from "../../interfaces/network.js";

export function getAlgodConfigFromEnvironment(): AlgodClientConfig {
  if (!process.env.NEXT_PUBLIC_ALGOD_SERVER) {
    throw new Error("Attempt to get default algod configuration without specifying NEXT_PUBLIC_ALGOD_SERVER in the environment variables");
  }

  return {
    server: process.env.NEXT_PUBLIC_ALGOD_SERVER,
    port: Number(process.env.NEXT_PUBLIC_ALGOD_PORT),
    token: process.env.NEXT_PUBLIC_ALGOD_TOKEN!,
    network: process.env.NEXT_PUBLIC_ALGOD_NETWORK!,
  };
}

export function getBackendAlgodConfigFromEnvironment(): AlgodClientConfig {
  if (!process.env.NEXT_PUBLIC_ALGOD_SERVER) {
    throw new Error("Attempt to get default algod configuration without specifying NEXT_PUBLIC_ALGOD_SERVER in the environment variables");
  }

  return {
    server: process.env.NEXT_PUBLIC_ALGOD_SERVER,
    port: Number(process.env.NEXT_PUBLIC_ALGOD_PORT),
    token: process.env.NODELY_BACKEND_ALGOD_TOKEN! || "",
    network: process.env.NEXT_PUBLIC_ALGOD_NETWORK! || "",
  };
}

export function getIndexerConfigFromEnvironment(): AlgodClientConfig {
  if (!process.env.NEXT_PUBLIC_INDEXER_SERVER) {
    throw new Error("Attempt to get default algod configuration without specifying INDEXER_SERVER in the environment variables");
  }

  return {
    server: process.env.NEXT_PUBLIC_INDEXER_SERVER,
    port: Number(process.env.NEXT_PUBLIC_INDEXER_PORT),
    token: process.env.NEXT_PUBLIC_INDEXER_TOKEN!,
    network: process.env.NEXT_PUBLIC_ALGOD_NETWORK!,
  };
}

export function getKmdConfigFromEnvironment(): AlgoKMDConfig {
  return {
    server: process.env.NEXT_PUBLIC_KMD_SERVER!,
    port: Number(process.env.NEXT_PUBLIC_KMD_PORT),
    token: process.env.NEXT_PUBLIC_KMD_TOKEN!,
    wallet: process.env.NEXT_PUBLIC_KMD_WALLET!,
    password: process.env.NEXT_PUBLIC_KMD_PASSWORD!,
  };
}
