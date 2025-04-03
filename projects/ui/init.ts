import { ListingFactoryFactory } from '@/contracts/ListingFactory';
import { MarketplacePluginFactory } from '@/contracts/MarketplacePlugin';
import { OptInPluginFactory } from '@/contracts/OptInPlugin';
import { getAlgodConfigFromEnvironment } from '@/utils/network/getAlgoClientConfigs';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import algosdk, { secretKeyToMnemonic } from 'algosdk';
import fs from 'node:fs';

const algodConfig = getAlgodConfigFromEnvironment()
const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200)
const kmdAccount = await algorand.account.fromKmd('unencrypted-default-wallet');
let envFile = fs.readFileSync('./.env.template', 'utf-8')
let rootEnvFile = fs.readFileSync('./../../.env.template', 'utf-8')

const optinPluginMinter = new OptInPluginFactory({
    defaultSender: kmdAccount.addr,
    defaultSigner: kmdAccount.signer,
    algorand
})

const optinPluginMintResults = await optinPluginMinter.send.create.createApplication()

envFile = envFile.replace('<REPLACE_WITH_OPTIN_PLUGIN_ID>', optinPluginMintResults.appClient.appId.toString())

const ListingFactoryMinter = new ListingFactoryFactory({
    defaultSender: kmdAccount.addr,
    defaultSigner: kmdAccount.signer,
    algorand
})

const listingFactoryMintResults = await ListingFactoryMinter.send.create.createApplication()

envFile = envFile.replace('<REPLACE_WITH_LISTING_FACTORY_ID>', listingFactoryMintResults.appClient.appId.toString())

const marketplacePluginMinter = new MarketplacePluginFactory({
    defaultSender: kmdAccount.addr,
    defaultSigner: kmdAccount.signer,
    algorand
})

const marketPlacePluginMintResults = await marketplacePluginMinter.send.create.bare({
    deployTimeParams: {
        FACTORY_APP_ID: listingFactoryMintResults.appClient.appId,
    }
})

envFile = envFile.replace('<REPLACE_WITH_MARKETPLACE_PLUGIN_ID>', marketPlacePluginMintResults.appClient.appId.toString())

const agentAccount = algosdk.generateAccount()

const dispenser = await algorand.account.dispenserFromEnvironment()

await algorand.account.ensureFunded(
    agentAccount.addr,
    dispenser,
    (1000000).algo(),
);

envFile = envFile.replace('<REPLACE_WITH_AGENT_ADDRESS>', agentAccount.addr.toString())
rootEnvFile = rootEnvFile.replace('<REPLACE_WITH_AGENT_MNEMONIC>', secretKeyToMnemonic(agentAccount.sk))

fs.writeFileSync('.env', envFile, 'utf-8')
fs.writeFileSync('../../.env', rootEnvFile, 'utf-8')