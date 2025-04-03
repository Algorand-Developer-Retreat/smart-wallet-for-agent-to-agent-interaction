'use client'

import { useWallet } from "@txnlab/use-wallet-react"
import { ConnectModal } from "./connectModal"
import { Button } from "./ui/button"
import { GetAbstractedAccountFactory, getOptinClient } from "@/utils/clients"
import { useState } from "react"
import { AbstractedAccountClient } from "@/contracts/AbstractedAccountClient"
import { getAgentPluginIDFromEnvironment, getOptinPluginIDFromEnvironment } from "@/utils/env"

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
const maxUint64 = BigInt('18446744073709551615');
const optInPluginID = getOptinPluginIDFromEnvironment()
const agentPluginID = getAgentPluginIDFromEnvironment()

export default function HomeSection() {
    const { activeAddress, transactionSigner } = useWallet()
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

        const methods = [
            [agent.appClient.getABIMethod('list').getSelector(), 0]
            [agent.appClient.getABIMethod('purchase').getSelector(), 0]
            [agent.appClient.getABIMethod('changePrice').getSelector(), 0]
            [agent.appClient.getABIMethod('delist').getSelector(), 0]
            [agent.appClient.getABIMethod('offer').getSelector(), 0]
        ]

        await abstractedAccountClient.send.arc58AddPlugin({
            sender: activeAddress,
            signer: transactionSigner,
            args: {
                app: agentPluginID,
                allowedCaller: agentAddress,
                lastValidRound: maxUint64,
                cooldown: 1,
                adminPrivileges: false,
                methods
            }
        });
    }

    if (!activeAddress) {
        return <ConnectModal />
    }

    return (
        <div>
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