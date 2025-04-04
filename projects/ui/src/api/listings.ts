import { getListingFactoryClient } from "@/utils/clients";
import { getAlgodConfigFromEnvironment } from "@/utils/network/getAlgoClientConfigs";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import algosdk from "algosdk";

const algodConfig = getAlgodConfigFromEnvironment()
const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200)

const listingFactoryClient = await getListingFactoryClient()

export async function getAllListings(): Promise<algosdk.modelsv2.Application[]> {
    const response = await algorand.client.algod.accountInformation(listingFactoryClient.appAddress).do();

    if (response.createdApps === undefined || response.createdApps?.length === 0) {
        return []
    }

    return response.createdApps
}
