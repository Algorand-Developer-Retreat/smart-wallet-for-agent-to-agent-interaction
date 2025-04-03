'use client'

import { useWallet } from "@txnlab/use-wallet-react"
import { ConnectModal } from "./connectModal"
import { Button } from "./ui/button"
import { GetAbstractedAccountFactory, getMarketplacePluginClient } from "@/utils/clients"
import { useState } from "react"
import { AbstractedAccountClient } from "@/contracts/AbstractedAccount"
import { getListingFactoryIDFromEnvironment, getMarketplacePluginIDFromEnvironment, getOptinPluginIDFromEnvironment } from "@/utils/env"

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
const maxUint64 = BigInt('18446744073709551615');
const optInPluginID = getOptinPluginIDFromEnvironment()
// const listingFactoryID = getListingFactoryIDFromEnvironment()
const marketPlacePluginID = getMarketplacePluginIDFromEnvironment()

export default function HomeSection() {
    const { activeWallet, activeAddress, transactionSigner } = useWallet()
    const [abstractedAccountClient, setAbstractedAccountClient] = useState<AbstractedAccountClient | null>(null)
    const [agentAddress, setAgentAddress] = useState<string | null>(null)

    const createSmartWallet = async () => {

        if (!activeAddress) {
            console.error('No active address')
            return
        }

        const factory = GetAbstractedAccountFactory({ defaultSender: activeAddress, defaultSigner: transactionSigner })

        const results = await factory.send.create.createApplication({
            args: {
                admin: activeAddress,
                controlledAddress: ZERO_ADDRESS
            }
        });

        setAbstractedAccountClient(results.appClient)
    }

    const installGlobalOptinPlugin = async () => {

        if (!activeAddress) {
            console.error('No active address')
            return
        }

        if (!abstractedAccountClient) {
            console.error('No abstracted account client')
            return
        }

        await abstractedAccountClient.send.arc58AddPlugin({
            sender: activeAddress,
            signer: transactionSigner,
            args: {
                app: optInPluginID,
                allowedCaller: ZERO_ADDRESS,
                lastValidRound: maxUint64,
                cooldown: 0,
                adminPrivileges: false,
                methods: []
            }
        });
    }

    const installAgentPlugin = async () => {

        if (!activeAddress) {
            console.error('No active address')
            return
        }

        if (!agentAddress) {
            console.error('No agent address')
            return
        }

        if (!abstractedAccountClient) {
            console.error('No abstracted account client')
            return
        }

        const marketplacePluginClient = await getMarketplacePluginClient({
            activeAddress,
            signer: transactionSigner
        })

        await abstractedAccountClient.send.arc58AddPlugin({
            sender: activeAddress,
            signer: transactionSigner,
            args: {
                app: marketPlacePluginID,
                allowedCaller: agentAddress,
                lastValidRound: maxUint64,
                cooldown: 1,
                adminPrivileges: false,
                methods: [
                    [marketplacePluginClient.appClient.getABIMethod('list').getSelector(), 0],
                    [marketplacePluginClient.appClient.getABIMethod('purchase').getSelector(), 0],
                    [marketplacePluginClient.appClient.getABIMethod('changePrice').getSelector(), 0],
                    [marketplacePluginClient.appClient.getABIMethod('delist').getSelector(), 0],
                    [marketplacePluginClient.appClient.getABIMethod('offer').getSelector(), 0]
                ]
            }
        });
    }

    if (!activeAddress) {
        return <ConnectModal />
    }

    return (
        <div className="z-50">
            <Button
                onClick={() => activeWallet?.disconnect()}
            >
                Disconnect
            </Button>
            <Button
                onClick={createSmartWallet}
            >
                Create Smart Wallet
            </Button>

            {
                abstractedAccountClient && (
                    <div>
                        <h2>Smart Wallet Created</h2>
                        <p>App ID: {abstractedAccountClient.appId.toString()}</p>
                        <p>Smart Wallet Address: {abstractedAccountClient.appAddress.toString()}</p>

                        <Button
                            onClick={installGlobalOptinPlugin}
                        >
                            Install Global Optin Plugin
                        </Button>

                        <Button
                            onClick={installAgentPlugin}
                        >
                            Install Agent Plugin
                        </Button>
                    </div>
                )
            }
        </div>
    )
}