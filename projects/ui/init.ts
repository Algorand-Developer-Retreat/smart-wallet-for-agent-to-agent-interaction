import { OptInPluginFactory } from '@/contracts/OptInPluginClient';
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

const optInMintResults = await optinPluginMinter.send.create.createApplication();

envFile = envFile.replace('<REPLACE_WITH_OPTIN_PLUGIN_ID>', optInMintResults.appClient.appId.toString())



// const agentPluginMinter = new AgentPluginFactory({
//     defaultSender: kmdAccount.addr,
//     defaultSigner: kmdAccount.signer,
//     algorand
// })

// const agentPluginMintResults = await agentPluginMinter.send.create.createApplication();

// envFile = envFile.replace('<REPLACE_WITH_AGENT_PLUGIN_ID>', agentPluginMintResults.appClient.appId.toString())

fs.writeFileSync('.env', envFile, 'utf-8')