import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { getAlgodConfigFromEnvironment } from "../utils/network/getAlgoClientConfigs.js";
import { getListingFactoryClient } from "../utils/clients.js";
import algosdk from "algosdk";
import { ListingClient, ListingInfo } from "../contracts/Listing.js";

const algodConfig = getAlgodConfigFromEnvironment()
const algorand = AlgorandClient.fromConfig({ algodConfig }).setDefaultValidityWindow(200)

const listingFactoryClient = await getListingFactoryClient()

export async function getAllListings(): Promise<ListingInfo[]> {
    const response = await algorand.client.algod.accountInformation(listingFactoryClient.appAddress).do();

    if (response.createdApps === undefined || response.createdApps?.length === 0) {
        return []
    }

    return await Promise.all(response.createdApps.map(async (app) => {
        const listingClient = await algorand.client.getTypedAppClientById(ListingClient, { appId: app.id })
        return await listingClient.getInfo()
    }))
}
