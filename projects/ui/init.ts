import { ListingFactoryFactory } from '@/contracts/ListingFactory';
import { MarketplacePluginFactory } from '@/contracts/MarketplacePlugin';
import { OptInPluginFactory } from '@/contracts/OptInPlugin';
import { getAlgodConfigFromEnvironment } from '@/utils/network/getAlgoClientConfigs';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import fs from 'node:fs';

const algodConfig = getAlgodConfigFromEnvironment()
const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200)
const kmdAccount = await algorand.account.fromKmd('unencrypted-default-wallet');
let envFile = fs.readFileSync('./.env.template', 'utf-8')

const optinPluginMinter = new OptInPluginFactory({
    defaultSender: kmdAccount.addr,
    defaultSigner: kmdAccount.signer,
    algorand
})

const optInMintResults = await optinPluginMinter.send.create.bare()

envFile = envFile.replace('<REPLACE_WITH_OPTIN_PLUGIN_ID>', optInMintResults.appClient.appId.toString())

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

const marketPlacePluginMintResults = await marketplacePluginMinter.send.create.bare()

envFile = envFile.replace('<REPLACE_WITH_MARKETPLACE_PLUGIN_ID>', marketPlacePluginMintResults.appClient.appId.toString())

fs.writeFileSync('.env', envFile, 'utf-8')