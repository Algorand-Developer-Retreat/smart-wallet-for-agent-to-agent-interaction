export function getListingFactoryIDFromEnvironment(): bigint {
    if (!process.env.NEXT_PUBLIC_LISTING_FACTORY_ID!) {
        throw new Error(
            'Attempt to get Listing Factory ID without specifying NEXT_PUBLIC_LISTING_FACTORY_ID in the environment variables',
        )
    }

    return BigInt(process.env.NEXT_PUBLIC_LISTING_FACTORY_ID!)
}

export function getMarketplacePluginIDFromEnvironment(): bigint {
    if (!process.env.NEXT_PUBLIC_MARKETPLACE_PLUGIN_ID!) {
        throw new Error(
            'Attempt to get Marketplace Plugin ID without specifying NEXT_PUBLIC_MARKETPLACE_PLUGIN_ID in the environment variables',
        )
    }

    return BigInt(process.env.NEXT_PUBLIC_MARKETPLACE_PLUGIN_ID!)
}