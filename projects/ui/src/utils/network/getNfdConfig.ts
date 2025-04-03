export function getNfdApiFromEnvironment(): string {
  if (!process.env.NEXT_PUBLIC_NFD_API_URL!) {
    throw new Error(
      'Attempt to get NFD API base URL without specifying NFD_API_URL in the environment variables',
    )
  }

  return process.env.NEXT_PUBLIC_NFD_API_URL!
}

export function getNfdAppFromEnvironment(): string {
  if (!process.env.NEXT_PUBLIC_NFD_APP_URL!) {
    throw new Error(
      'Attempt to get NFD app base URL without specifying NFD_APP_URL in the environment variables',
    )
  }

  return process.env.NEXT_PUBLIC_NFD_APP_URL!
}
