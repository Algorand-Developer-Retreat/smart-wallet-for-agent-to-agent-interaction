export function getOptinPluginIDFromEnvironment(): bigint {
    if (!process.env.NEXT_PUBLIC_OPTIN_PLUGIN_ID!) {
        throw new Error(
            'Attempt to get Optin Plugin ID without specifying NEXT_PUBLIC_OPTIN_PLUGIN_ID in the environment variables',
        )
    }

    return BigInt(process.env.NEXT_PUBLIC_OPTIN_PLUGIN_ID!)
}


export function getAgentPluginIDFromEnvironment(): bigint {
    if (!process.env.NEXT_PUBLIC_AGENT_PLUGIN_ID!) {
        throw new Error(
            'Attempt to get Agent Plugin ID without specifying NEXT_PUBLIC_AGENT_PLUGIN_ID in the environment variables',
        )
    }

    return BigInt(process.env.NEXT_PUBLIC_AGENT_PLUGIN_ID!)
}