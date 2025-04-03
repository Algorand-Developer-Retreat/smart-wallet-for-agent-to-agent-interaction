export interface ExplorerConfig {
  accountUrl: string
  transactionUrl: string
  assetUrl: string
  appUrl: string
}

export function getExplorerConfigFromViteEnvironment(): ExplorerConfig {
  if (!process.env.NEXT_PUBLIC_EXPLORER_ACCOUNT_URL) {
    throw new Error(
      'Attempt to get block explorer config without specifying EXPLORER_ACCOUNT_URL in the environment variables',
    )
  }

  return {
    accountUrl: process.env.NEXT_PUBLIC_EXPLORER_ACCOUNT_URL,
    transactionUrl: process.env.NEXT_PUBLIC_EXPLORER_TRANSACTION_URL!,
    assetUrl: process.env.NEXT_PUBLIC_EXPLORER_ASSET_URL!,
    appUrl: process.env.NEXT_PUBLIC_EXPLORER_APPLICATION_URL!,
  }
}
