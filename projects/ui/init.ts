import { AbstractedAccountClient, AbstractedAccountFactory } from "@/contracts/AbstractedAccount";
import { ListingFactoryFactory } from "@/contracts/ListingFactory";
import { MarketplacePluginClient, MarketplacePluginFactory } from "@/contracts/MarketplacePlugin";
import { OptInPluginClient, OptInPluginFactory } from "@/contracts/OptInPlugin";
import { getAlgodConfigFromEnvironment } from "@/utils/network/getAlgoClientConfigs";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk, { ALGORAND_ZERO_ADDRESS_STRING, makeBasicAccountTransactionSigner, secretKeyToMnemonic } from "algosdk";
import fs from "node:fs";

interface GetAbstractedAccountFactoryParams {
    defaultSender?: string | algosdk.Address | undefined
    defaultSigner?: algosdk.TransactionSigner | undefined
}

function GetAbstractedAccountFactory({
    defaultSender,
    defaultSigner,
}: GetAbstractedAccountFactoryParams): AbstractedAccountFactory {
    return new AbstractedAccountFactory({
        defaultSender,
        defaultSigner,
        algorand: algorand,
    })
}

interface GetAbstractAccountClientParams {
    signer: algosdk.TransactionSigner
    activeAddress: string
    appId?: bigint
}

async function getAbstractAccountClient({ activeAddress, signer, appId = 0n }: GetAbstractAccountClientParams): Promise<AbstractedAccountClient> {
    algorand.setSigner(activeAddress, signer)
    return algorand.client.getTypedAppClientById(AbstractedAccountClient, {
        defaultSender: activeAddress,
        appId: appId,
    })
}


interface GetClientParamsWithAppId {
    signer: algosdk.TransactionSigner
    defaultSender: string
    appId: bigint
}

async function getOptinPluginClient({ defaultSender, signer, appId }: GetClientParamsWithAppId): Promise<OptInPluginClient> {
    algorand.setSigner(defaultSender, signer)
    return algorand.client.getTypedAppClientById(OptInPluginClient, {
        defaultSender,
        appId,
    })
}


async function getMarketplacePluginClient({ defaultSender, signer, appId }: GetClientParamsWithAppId): Promise<MarketplacePluginClient> {
    algorand.setSigner(defaultSender, signer)
    return algorand.client.getTypedAppClientById(MarketplacePluginClient, {
        defaultSender,
        appId,
    })
}

const algodConfig = getAlgodConfigFromEnvironment();
const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200);
const kmdAccount = await algorand.account.fromKmd("unencrypted-default-wallet");
const dispenser = await algorand.account.dispenserFromEnvironment();

let envFile = fs.readFileSync("./.env.template", "utf-8");
let mcpEnvFile = fs.readFileSync("./../mcp-server/.env.template", "utf-8");

const maxUint64 = BigInt('18446744073709551615');

const optinPluginMinter = new OptInPluginFactory({
  defaultSender: kmdAccount.addr,
  defaultSigner: kmdAccount.signer,
  algorand,
});

const optinPluginMintResults = await optinPluginMinter.send.create.createApplication();

const optinPluginID = optinPluginMintResults.appClient.appId;

envFile = envFile.replace("<REPLACE_WITH_OPTIN_PLUGIN_ID>", optinPluginID.toString());
mcpEnvFile = mcpEnvFile.replace("<REPLACE_WITH_OPTIN_PLUGIN_ID>", optinPluginID.toString());

const ListingFactoryMinter = new ListingFactoryFactory({
  defaultSender: kmdAccount.addr,
  defaultSigner: kmdAccount.signer,
  algorand,
});

const listingFactoryMintResults = await ListingFactoryMinter.send.create.createApplication();

await algorand.account.ensureFunded(listingFactoryMintResults.appClient.appAddress, dispenser, (100_000).algo());

envFile = envFile.replace("<REPLACE_WITH_LISTING_FACTORY_ID>", listingFactoryMintResults.appClient.appId.toString());
mcpEnvFile = mcpEnvFile.replace("<REPLACE_WITH_LISTING_FACTORY_ID>", listingFactoryMintResults.appClient.appId.toString());

const marketplacePluginMinter = new MarketplacePluginFactory({
  defaultSender: kmdAccount.addr,
  defaultSigner: kmdAccount.signer,
  algorand,
});

const marketPlacePluginMintResults = await marketplacePluginMinter.send.create.bare({
  deployTimeParams: {
    FACTORY_APP_ID: listingFactoryMintResults.appClient.appId,
  },
});

const marketPlacePluginID = marketPlacePluginMintResults.appClient.appId;

envFile = envFile.replace("<REPLACE_WITH_MARKETPLACE_PLUGIN_ID>", marketPlacePluginID.toString());
mcpEnvFile = mcpEnvFile.replace("<REPLACE_WITH_MARKETPLACE_PLUGIN_ID>", marketPlacePluginID.toString());
const agentAccount = algosdk.generateAccount();
const agentSigner = makeBasicAccountTransactionSigner(agentAccount);

await algorand.account.ensureFunded(agentAccount.addr, dispenser, (1_000_000).algo());

envFile = envFile.replace("<REPLACE_WITH_AGENT_ADDRESS>", agentAccount.addr.toString());
mcpEnvFile = mcpEnvFile.replace("<REPLACE_WITH_AGENT_MNEMONIC>", secretKeyToMnemonic(agentAccount.sk));

const sellerAccount = algosdk.generateAccount();
const sellerSigner = makeBasicAccountTransactionSigner(sellerAccount)
await algorand.account.ensureFunded(sellerAccount.addr, dispenser, (10_000_000).algo());

// create smart wallet for seller
const factory = GetAbstractedAccountFactory({ defaultSender: sellerAccount.addr, defaultSigner: sellerSigner })

const results = await factory.send.create.createApplication({
  args: {
    admin: sellerAccount.addr.toString(),
    controlledAddress: ALGORAND_ZERO_ADDRESS_STRING
  }
})

const abstractedAccountAppId = results.appClient.appId;
const abstractedAccountAppAddress = results.appClient.appAddress;

mcpEnvFile = mcpEnvFile.replace("<REPLACE_WITH_SELLER_SMART_WALLET_APP_ID>", abstractedAccountAppId.toString());

await algorand.send.payment({
  sender: sellerAccount.addr,
  signer: sellerSigner,
  receiver: abstractedAccountAppAddress,
  amount: (10_000_000n).microAlgo(),
})

const abstractedAccountClient = await getAbstractAccountClient({
  activeAddress: sellerAccount.addr.toString(),
  signer: sellerSigner,
  appId: abstractedAccountAppId
})

// install the opt-in plugin
const addPluginresults = await abstractedAccountClient.send.arc58AddPlugin({
  sender: sellerAccount.addr,
  signer: sellerSigner,
  args: {
      app: optinPluginID,
      allowedCaller: ALGORAND_ZERO_ADDRESS_STRING,
      lastValidRound: maxUint64,
      cooldown: 0,
      adminPrivileges: false,
      methods: []
  }
});

// install the agent marketplace plugin
await abstractedAccountClient.send.arc58AddPlugin({
  sender: sellerAccount.addr,
  signer: sellerSigner,
  args: {
    app: marketPlacePluginID,
    allowedCaller: agentAccount.addr.toString(),
    lastValidRound: maxUint64,
    cooldown: 1,
    adminPrivileges: false,
    methods: []
  }
});

// create NFT to sell
// list the NFT 

const asaConfig = await algorand.send.assetCreate({
  sender: sellerAccount.addr,
  total: 1n,
  decimals: 0,
  defaultFrozen: false,
  unitName: 'NFT',
  assetName: 'NFT',
  manager: sellerAccount.addr,
  reserve: sellerAccount.addr,
  url: '',
})

const mbrPayment = algorand.createTransaction.payment({
  sender: sellerAccount.addr,
  receiver: abstractedAccountClient.appAddress,
  amount: (200_000).microAlgo(),
});

const optInPluginClient = await getOptinPluginClient({ appId: optinPluginID, defaultSender: sellerAccount.addr.toString(), signer: sellerSigner })

// Form the group txn needed to call the opt-in plugin
const optInGroup = (
  await (optInPluginClient
    .createTransaction
    .optInToAsset({
      sender: sellerAccount.addr,
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
  sender: sellerAccount.addr,
  receiver: abstractedAccountClient.appAddress,
  assetId: asaConfig.assetId,
  amount: 1n,
})

await abstractedAccountClient
  .newGroup()
  .arc58RekeyToPlugin({
    sender: sellerAccount.addr,
    signer: sellerSigner,
    args: {
      plugin: optinPluginID,
      methodOffsets: [],
    },
    extraFee: (1000).microAlgo(),
  })
  // Add the mbr payment
  .addTransaction(optInGroup[0], sellerSigner) // mbrPayment
  // Add the opt-in plugin call
  .addTransaction(optInGroup[1], sellerSigner) // optInToAsset
  .arc58VerifyAuthAddr()
  .addTransaction(sendAsa, sellerSigner) // sendAsa
  .send()

const marketPlacePluginClient = await getMarketplacePluginClient({ appId: marketPlacePluginID, defaultSender: agentAccount.addr.toString(), signer: agentSigner })

const listCall = (await marketPlacePluginClient.createTransaction.list({
  sender: agentAccount.addr,
  signer: agentSigner,
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
      sender: agentAccount.addr,
      signer: agentSigner,
      args: {
        plugin: marketPlacePluginID,
        methodOffsets: []
      },
      extraFee: (1000).microAlgos(),
    })
    .addTransaction(listCall, agentSigner) // list asset
    .arc58VerifyAuthAddr({
      sender: agentAccount.addr,
      signer: agentSigner,
      args: {},
    })
    .send()

  console.log('listed NFT, txId:', listCallResults.txIds)

  // const listings = await getAllListings()

  // console.log('listing ids', listings)

  // setListingAppID(listings[0].id)
} catch (e: any) {
  console.error('Error listing NFT:', e)
}

fs.writeFileSync(".env", envFile, "utf-8");
fs.writeFileSync("../mcp-server/.env", mcpEnvFile, "utf-8");
fs.writeFileSync("../mcp-client/.env", mcpEnvFile, "utf-8");
