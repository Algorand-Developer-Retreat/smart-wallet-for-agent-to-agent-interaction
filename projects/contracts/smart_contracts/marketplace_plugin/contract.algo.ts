import {
  Application,
  assert,
  Asset,
  Bytes,
  Global,
  itxn,
  op,
  TemplateVar,
  Uint64,
  uint64,
} from '@algorandfoundation/algorand-typescript'
import { abiCall, compileArc4 } from '@algorandfoundation/algorand-typescript/arc4'

import { Listing } from '../listing_contract/contract.algo'
import { Plugin } from '../plugin/contract.algo'

import { NEGOTIATED_PRICE_KEY } from '../listing_contract/constants'
import { ListingFactory } from '../listing_factory/contract.algo'

const NOT_ENOUGH_ASSET = 'Not enough asset'
const LISTING_CREATOR_NOT_MARKETPLACE = 'Creator is not the marketplace'

/** the app id of the listing factory contract */
const factoryAppID = TemplateVar<uint64>('FACTORY_APP_ID')

export class MarketplacePlugin extends Plugin {

  list(sender: uint64, rekeyBack: boolean, asset: uint64, assetAmount: uint64): uint64 {
    const senderApp = Application(sender)
    const controlledAccount = this.getControlledAccount(senderApp)
    const factoryApp = Application(factoryAppID)
    assert(Asset(asset).balance(controlledAccount) >= assetAmount, NOT_ENOUGH_ASSET)

    const needsToOptIntoAsset = !factoryApp.address.isOptedIn(Asset(asset))
    const listingFactoryApp = compileArc4(ListingFactory)
    if (needsToOptIntoAsset) {
      const optInPayment = itxn.payment({
        sender: controlledAccount,
        receiver: factoryApp.address,
        amount: Global.assetOptInMinBalance,
        fee: 0,
      })

      listingFactoryApp.call.optinToListingAsset({
        appId: factoryAppID,
        args: [optInPayment, asset],
        fee: 0,
      })
    }
    const listingContract = compileArc4(Listing)
    const childContractMBR = Uint64(
      100_000 +
        28_500 * listingContract.globalUints +
        50_000 * listingContract.globalBytes +
        (Global.assetOptInMinBalance * 2),
    )

    const mbrPayment = itxn.payment({
      sender: controlledAccount,
      receiver: factoryApp.address,
      amount: childContractMBR,
      fee: 0,
    })

    const assetTransfer = itxn.assetTransfer({
      sender: controlledAccount,
      assetReceiver: factoryApp.address,
      assetAmount: assetAmount,
      xferAsset: asset,
      fee: 0,
    })

    const createdListingApp = listingFactoryApp.call.list({
      sender: controlledAccount,
      appId: factoryAppID,
      args: [mbrPayment, assetTransfer],
      fee: 0,
      rekeyTo: rekeyBack ? senderApp.address : Global.zeroAddress,
      extraProgramPages: 0,
    }).returnValue

    return createdListingApp
  }

  recordNegotiatedPrice(
    sender: uint64,
    rekeyBack: boolean,
    listingAppID: uint64,
    price: uint64,
  ): void {
    const senderApp = Application(sender)
    const controlledAccount = this.getControlledAccount(senderApp)

    const factoryAddress = Application(factoryAppID).address
    const listingApp = Application(listingAppID)

    assert(listingApp.creator === factoryAddress, 'listing is not from factory')

    abiCall(Listing.prototype.recordNegotiatedPrice, {
      sender: controlledAccount,
      appId: listingAppID,
      args: [price],
      rekeyTo: rekeyBack ? controlledAccount : Global.zeroAddress,
      fee: 0,
    })
  }

  purchase(sender: uint64, rekeyBack: boolean, listingAppID: uint64): void {
    const senderApp = Application(sender)
    const controlledAccount = this.getControlledAccount(senderApp)
    const factoryApp = Application(factoryAppID)
    const listingApp = Application(listingAppID)

    assert(listingApp.creator === factoryApp.address, LISTING_CREATOR_NOT_MARKETPLACE)

    const [negotiatedPrice] = op.AppGlobal.getExUint64(listingApp, Bytes(NEGOTIATED_PRICE_KEY))

    const purchasePayment = itxn.payment({
      sender: controlledAccount,
      receiver: factoryApp.address,
      amount: negotiatedPrice,
      fee: 0,
    })

    abiCall(ListingFactory.prototype.purchase, {
      sender: controlledAccount,
      appId: factoryAppID,
      args: [purchasePayment, listingAppID],
      fee: 0,
      rekeyTo: rekeyBack ? controlledAccount : Global.zeroAddress,
    })
  }

  delist(sender: uint64, rekeyBack: boolean, listingAppID: uint64): void {
    const senderApp = Application(sender)
    const controlledAccount = this.getControlledAccount(senderApp)
    const factoryApp = Application(factoryAppID)
    const listingApp = Application(listingAppID)
    assert(listingApp.creator === factoryApp.address, LISTING_CREATOR_NOT_MARKETPLACE)

    const listingFactoryApp = compileArc4(ListingFactory)
    listingFactoryApp.call.delist({
      sender: controlledAccount,
      appId: factoryAppID,
      args: [listingAppID],
      fee: 0,
      rekeyTo: rekeyBack ? controlledAccount : Global.zeroAddress,
    })
  }
}
