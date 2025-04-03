'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletId, WalletManager, WalletProvider, type SupportedWallet } from "@txnlab/use-wallet-react";
import { Toaster } from "./ui/sonner";
import { getAlgodConfigFromEnvironment } from "@/utils/network/getAlgoClientConfigs";
import { getAlgodNetwork } from "@/utils/network/getNetworkId";

let walletProviders: SupportedWallet[] = [
    WalletId.DEFLY,
    WalletId.PERA,
    WalletId.EXODUS,
    WalletId.KIBISIS,
    { id: WalletId.LUTE, options: { siteName: "Algotard.io" } },
];

if (process.env.NEXT_PUBLIC_KMD_SERVER) {
    walletProviders = [
        WalletId.KMD,
        ...walletProviders,
    ]
}

const algodConfig = getAlgodConfigFromEnvironment()
const defaultNetwork = getAlgodNetwork()

const walletManager = new WalletManager({
    wallets: walletProviders,
    defaultNetwork,
    networks: {
        [defaultNetwork]: {
            algod: {
                baseServer: algodConfig.server,
                port: algodConfig.port,
                token: algodConfig.token as string,
            },
        },
    },
    options: {
        resetNetwork: true,
    },
});

const queryClient = new QueryClient();

export default function ContextWrapper({ children }: { children: React.ReactNode }) {
    return (
        <>
            <QueryClientProvider client={queryClient}>
                <WalletProvider manager={walletManager}>
                    {children}
                </WalletProvider>
            </QueryClientProvider>
            <Toaster />
        </>
    )
}