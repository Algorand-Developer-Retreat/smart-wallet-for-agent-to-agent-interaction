'use client'

import { useWallet } from "@txnlab/use-wallet-react"
import { ConnectModal } from "./connectModal"
import { Button } from "./ui/button"
import { GetAbstractedAccountFactory, getMarketplacePluginClient, getOptinPluginClient } from "@/utils/clients"
import { useState } from "react"
import { AbstractedAccountClient } from "@/contracts/AbstractedAccount"
import { getAgentAddressFromEnvironment, getMarketplacePluginIDFromEnvironment, getOptinPluginIDFromEnvironment } from "@/utils/env"
import { AlgorandClient } from "@algorandfoundation/algokit-utils"
import { getAlgodConfigFromEnvironment } from "@/utils/network/getAlgoClientConfigs"
import { getAllListings } from "@/api/listings"

const ZERO_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
const maxUint64 = BigInt('18446744073709551615');

const algodConfig = getAlgodConfigFromEnvironment()

const optinPluginID = getOptinPluginIDFromEnvironment()
const marketPlacePluginID = getMarketplacePluginIDFromEnvironment()
const agentAddress = getAgentAddressFromEnvironment()

export default function HomeSection() {
    const { activeWallet, activeAddress, transactionSigner, signTransactions } = useWallet()
    const [abstractedAccountClient, setAbstractedAccountClient] = useState<AbstractedAccountClient | null>(null)
    const [listingAppID, setListingAppID] = useState<bigint | null>(null)

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
        })

        setAbstractedAccountClient(results.appClient)

        const algorand = AlgorandClient
            .fromConfig({ algodConfig })
            .setDefaultValidityWindow(200)
            .setDefaultSigner(transactionSigner)

        await algorand.send.payment({
            sender: activeAddress,
            signer: transactionSigner,
            receiver: results.appClient.appAddress,
            amount: (10000000n).algo(),
        })

        console.log('Created smart wallet, txId:', results.result.txIds)
    }

    const installOptinPlugin = async () => {
        if (!activeAddress) {
            console.error('No active address')
            return
        }

        if (!abstractedAccountClient) {
            console.error('No abstracted account client')
            return
        }

        const addPluginresults = await abstractedAccountClient.send.arc58AddPlugin({
            sender: activeAddress,
            signer: transactionSigner,
            args: {
                app: optinPluginID,
                allowedCaller: ZERO_ADDRESS,
                lastValidRound: maxUint64,
                cooldown: 0,
                adminPrivileges: false,
                methods: []
            }
        });

        console.log('Added optin plugin, txId:', addPluginresults.txIds)
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

        const addPluginresults = await abstractedAccountClient.send.arc58AddPlugin({
            sender: activeAddress,
            signer: transactionSigner,
            args: {
                app: marketPlacePluginID,
                // allowedCaller: agentAddress,
                allowedCaller: ZERO_ADDRESS,
                lastValidRound: maxUint64,
                cooldown: 1,
                adminPrivileges: false,
                methods: []
            }
        });

        console.log('Added agent plugin, txId:', addPluginresults.txIds)
    }

    const listNFT = async () => {

        if (!activeAddress) {
            console.error('No active address')
            return
        }

        if (!abstractedAccountClient) {
            console.error('No abstracted account client')
            return
        }

        const algorand = AlgorandClient
            .fromConfig({ algodConfig })
            .setDefaultValidityWindow(200)
            .setDefaultSigner(transactionSigner)

        const optInPluginClient = await getOptinPluginClient({
            activeAddress: activeAddress,
            signer: transactionSigner
        })

        const asaConfig = await algorand.send.assetCreate({
            sender: activeAddress,
            total: 1n,
            decimals: 0,
            defaultFrozen: false,
            unitName: 'NFT',
            assetName: 'NFT',
            manager: activeAddress,
            reserve: activeAddress,
            url: 'https://example.com',
        })

        const mbrPayment = algorand.createTransaction.payment({
            sender: activeAddress,
            receiver: abstractedAccountClient.appAddress,
            amount: (200_000).microAlgo(),
        });

        // Form the group txn needed to call the opt-in plugin
        const optInGroup = (
            await (optInPluginClient
                .createTransaction
                .optInToAsset({
                    sender: activeAddress,
                    args: {
                        sender: abstractedAccountClient.appId,
                        rekeyBack: true,
                        asset: asaConfig.assetId,
                        mbrPayment
                    },
                    extraFee: (1_000).microAlgo()
                }))
        ).transactions;

        const sendAsa = await algorand.createTransaction.assetTransfer({
            sender: activeAddress,
            receiver: abstractedAccountClient.appAddress,
            assetId: asaConfig.assetId,
            amount: 1n,
        })

        await abstractedAccountClient
            .newGroup()
            .arc58RekeyToPlugin({
                sender: activeAddress,
                signer: transactionSigner,
                args: {
                    plugin: optinPluginID,
                    methodOffsets: [],
                },
                extraFee: (1000).microAlgo(),
            })
            // Add the mbr payment
            .addTransaction(optInGroup[0], transactionSigner) // mbrPayment
            // Add the opt-in plugin call
            .addTransaction(optInGroup[1], transactionSigner) // optInToAsset
            .arc58VerifyAuthAddr()
            .addTransaction(sendAsa, transactionSigner) // sendAsa
            .send()

        const marketPlacePluginClient = await getMarketplacePluginClient({ activeAddress: activeAddress, signer: transactionSigner })

        const listCall = (await marketPlacePluginClient.createTransaction.list({
            sender: activeAddress,
            signer: transactionSigner,
            args: {
                sender: abstractedAccountClient.appId,
                rekeyBack: true,
                asset: asaConfig.assetId,
                assetAmount: 1n,
            },
            extraFee: (14000).microAlgos(),
        })).transactions[0]

        try {
            // TODO: BUG: get the actual listing app id from the list call
            const listCallResults = await abstractedAccountClient
                .newGroup()
                .arc58RekeyToPlugin({
                    sender: activeAddress,
                    signer: transactionSigner,
                    args: {
                        plugin: marketPlacePluginID,
                        methodOffsets: []
                    },
                    extraFee: (1000).microAlgos(),
                })
                .addTransaction(listCall, transactionSigner) // list asset
                .arc58VerifyAuthAddr({
                    sender: activeAddress,
                    signer: transactionSigner,
                    args: {},
                })
                .send()

                console.log('listed NFT, txId:', listCallResults.txIds)

                const listings = await getAllListings()

                console.log('listing ids', listings)

                setListingAppID(listings[0].id)
        } catch (e: any) {
            alert(`Error: ${e.message}`)
        }
    }

    const acceptOffer = async () => {
        if (!activeAddress) {
            console.error('No active address')
            return
        }

        if (!abstractedAccountClient) {
            console.error('No abstracted account client')
            return
        }

        const marketPlacePluginClient = await getMarketplacePluginClient({ activeAddress: activeAddress, signer: transactionSigner })

        const recordNegotiatedPriceCall = (await marketPlacePluginClient.createTransaction.recordNegotiatedPrice({
            sender: activeAddress,
            signer: transactionSigner,
            args: {
                sender: abstractedAccountClient.appId,
                rekeyBack: true,
                price: 10_000n,
                listingAppId: listingAppID!,
            },
            extraFee: (1000).microAlgos(),
        })).transactions[0]

        try {
            const recordPriceResult = await abstractedAccountClient
                .newGroup()
                .arc58RekeyToPlugin({
                    sender: activeAddress,
                    signer: transactionSigner,
                    args: {
                        plugin: marketPlacePluginID,
                        methodOffsets: []
                    },
                    extraFee: (1000).microAlgos(),
                })
                .addTransaction(recordNegotiatedPriceCall, transactionSigner) // list asset
                .arc58VerifyAuthAddr({
                    sender: activeAddress,
                    signer: transactionSigner,
                    args: {},
                })
                .send()

            console.log('accepted 10,000 price, txId', recordPriceResult.txIds)

        } catch (e: any) {
            alert(`Error: ${e}`)
        }
    }

    const purchase = async () => {
        if (!activeAddress) {
            console.error('No active address')
            return
        }

        if (!abstractedAccountClient) {
            console.error('No abstracted account client')
            return
        }

        const marketPlacePluginClient = await getMarketplacePluginClient({ activeAddress: activeAddress, signer: transactionSigner })

        const purchaseCall = (await marketPlacePluginClient.createTransaction.purchase({
            sender: activeAddress,
            signer: transactionSigner,
            args: {
                sender: abstractedAccountClient.appId,
                rekeyBack: true,
                listingAppId: listingAppID!,
            },
            extraFee: (8000).microAlgos(),
        })).transactions[0]

        try {
            const purchaseResult = await abstractedAccountClient
                .newGroup()
                .arc58RekeyToPlugin({
                    sender: activeAddress,
                    signer: transactionSigner,
                    args: {
                        plugin: marketPlacePluginID,
                        methodOffsets: []
                    },
                    extraFee: (1000).microAlgos(),
                })
                .addTransaction(purchaseCall, transactionSigner) // list asset
                .arc58VerifyAuthAddr({
                    sender: activeAddress,
                    signer: transactionSigner,
                    args: {},
                })
                .send()

            console.log('purchased NFT, txId', purchaseResult.txIds)

        } catch (e: any) {
            alert(`Error: ${e}`)
        }
    }

    // const delistNFT = async () => {

    // }

    if (!activeAddress) {
        return <ConnectModal />
    }

    return (
        <div className="z-50 flex flex-col gap-4 py-4 px-10 justify-center">
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
                    <div className="bg-zinc-800 rounded-md p-4 shadow text-white flex flex-col gap-4 justify-center">
                        <h2>Smart Wallet Created</h2>
                        <p>App ID: {abstractedAccountClient.appId.toString()}</p>
                        <p>Smart Wallet Address: {abstractedAccountClient.appAddress.toString()}</p>

                        <Button
                            onClick={installAgentPlugin}
                        >
                            Install Agent Plugin
                        </Button>

                        <Button
                            onClick={installOptinPlugin}
                        >
                            Install Optin Plugin
                        </Button>

                        <Button
                            onClick={listNFT}
                        >
                            List NFT
                        </Button>

                        <Button
                            onClick={acceptOffer}
                        >
                            Accept Offer of 10,000 mAlgo
                        </Button>

                        <Button
                            onClick={purchase}
                        >
                            Purchase NFT
                        </Button>
                    </div>
                )
            }
        </div>
    )
}