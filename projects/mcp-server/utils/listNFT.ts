import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { getOptinPluginClient, getMarketplacePluginClient } from "./clients.js";
import { AbstractedAccountClient } from "../contracts/AbstractedAccount.js";

const AGENT_MNEMONIC = process.env.AGENT_MNEMONIC;

function getAgentAccount() {
  if (!AGENT_MNEMONIC) {
    throw new Error("AGENT_MNEMONIC is not set");
  }

  const algorand = AlgorandClient.defaultLocalNet();
  const agentAccount = algorand.account.fromMnemonic(AGENT_MNEMONIC);

  return agentAccount;
}

const activeAddress = getAgentAccount().addr.toString();

export const listNFT = async () => {
  if (!activeAddress) {
    console.error("No active address");
    return;
  }

  if (!abstractedAccountClient) {
    console.error("No abstracted account client");
    return;
  }

  const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200).setDefaultSigner(transactionSigner);

  const optInPluginClient = await getOptinPluginClient({
    activeAddress: activeAddress,
    signer: transactionSigner,
  });

  const asaConfig = await algorand.send.assetCreate({
    sender: activeAddress,
    total: 1n,
    decimals: 0,
    defaultFrozen: false,
    unitName: "NFT",
    assetName: "NFT",
    manager: activeAddress,
    reserve: activeAddress,
    url: "https://example.com",
  });

  const mbrPayment = algorand.createTransaction.payment({
    sender: activeAddress,
    receiver: AbstractedAccountClient.appAddress,
    amount: (200_000).microAlgo(),
  });

  // Form the group txn needed to call the opt-in plugin
  const optInGroup = (
    await optInPluginClient.createTransaction.optInToAsset({
      sender: activeAddress,
      args: {
        sender: abstractedAccountClient.appId,
        rekeyBack: true,
        asset: asaConfig.assetId,
        mbrPayment,
      },
      extraFee: (1_000).microAlgo(),
    })
  ).transactions;

  const sendAsa = await algorand.createTransaction.assetTransfer({
    sender: activeAddress,
    receiver: abstractedAccountClient.appAddress,
    assetId: asaConfig.assetId,
    amount: 1n,
  });

  const optinResults = await abstractedAccountClient
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
    .send();

  console.log("optinResults", optinResults);

  const marketPlacePluginClient = await getMarketplacePluginClient({ activeAddress: activeAddress, signer: transactionSigner });

  const listCall = (
    await marketPlacePluginClient.createTransaction.list({
      sender: activeAddress,
      signer: transactionSigner,
      args: {
        sender: abstractedAccountClient.appId,
        rekeyBack: true,
        asset: asaConfig.assetId,
        assetAmount: 1n,
      },
      extraFee: (14000).microAlgos(),
    })
  ).transactions[0];

  try {
    await abstractedAccountClient
      .newGroup()
      .arc58RekeyToPlugin({
        sender: activeAddress,
        signer: transactionSigner,
        args: {
          plugin: marketPlacePluginID,
          methodOffsets: [],
        },
        extraFee: (1000).microAlgos(),
      })
      .addTransaction(listCall, transactionSigner) // list asset
      .arc58VerifyAuthAddr({
        sender: activeAddress,
        signer: transactionSigner,
        args: {},
      })
      .send();
  } catch (e: any) {
    alert(`Error: ${e.message}`);
  }
};
