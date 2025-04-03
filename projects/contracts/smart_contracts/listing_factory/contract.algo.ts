import {
  abimethod,
  Account,
  Application,
  assert,
  Bytes,
  GlobalState,
  gtxn,
  itxn,
  OnCompleteAction,
  op,
  Uint64,
  uint64,
} from '@algorandfoundation/algorand-typescript'
import { Address, compileArc4, Contract } from '@algorandfoundation/algorand-typescript/arc4'
import { Global, Txn } from '@algorandfoundation/algorand-typescript/op'

import { SELLER_KEY } from '../listing_contract/constants'
import { Listing } from '../listing_contract/contract.algo'
import {
  ASSET_TRANSFER_FAILED,
  CHILD_CONTRACT_MBR,
  NOT_A_LISTING,
  PAYMENT_AMOUNT_MUST_BE_EQUAL_TO_MBR_AMOUNT,
  PAYMENT_AMOUNT_MUST_BE_GREATER_THAN_0,
  PAYMENT_RECEIVER_MUST_BE_CURRENT_APPLICATION_ADDRESS,
} from './constants'

export class ListingFactory extends Contract {
  // MBR of the child listing contract
  childContractMBR = GlobalState<uint64>({ key: CHILD_CONTRACT_MBR })

  private calculateChildContractMbr(globalUints: uint64, globalBytes: uint64): uint64 {
    return Uint64(100_000 + 28_500 * globalUints + 50_000 * globalBytes)
  }

  @abimethod({ onCreate: 'require' })
  public createApplication(): void {
    const listingContract = compileArc4(Listing)
    const childContractMBR = this.calculateChildContractMbr(listingContract.globalUints, listingContract.globalBytes)
    this.childContractMBR.value = childContractMBR
  }

  // @ts-ignore
  @abimethod({ allowActions: 'UpdateApplication' })
  public updateApplication(): void {}

  public list(payment: gtxn.PaymentTxn, assetXfer: gtxn.AssetTransferTxn, minimumPriceToAccept: uint64): uint64 {
    const listingContract = compileArc4(Listing)
    const mbrAmount = Uint64(this.childContractMBR.value + Global.assetOptInMinBalance)

    // ensure they paid enough to cover the contract mint + mbr costs
    assert(payment.amount === mbrAmount, PAYMENT_AMOUNT_MUST_BE_EQUAL_TO_MBR_AMOUNT)
    assert(payment.receiver === Global.currentApplicationAddress, PAYMENT_RECEIVER_MUST_BE_CURRENT_APPLICATION_ADDRESS)

    // make sure they actually send the asset they want to sell
    assert(assetXfer.assetAmount > 0, ASSET_TRANSFER_FAILED)
    assert(assetXfer.assetReceiver === Global.currentApplicationAddress, ASSET_TRANSFER_FAILED)

    // mint listing contract
    // initialize child
    const createdListingApp = listingContract.call.createListingApplication({
      args: [assetXfer.xferAsset, new Address(Txn.sender), minimumPriceToAccept],
      fee: 0,
    }).itxn.createdApp

    const optInPayment = itxn.payment({
      receiver: createdListingApp.address,
      amount: Global.assetOptInMinBalance,
      fee: 0,
    })

    // optin child contract to sale asset
    listingContract.call.optinToListingAsset({
      appId: createdListingApp.id,
      args: [optInPayment, assetXfer.xferAsset.id],
      fee: 0,
    })

    // xfer asset to child
    itxn
      .assetTransfer({
        assetReceiver: createdListingApp.address,
        assetAmount: assetXfer.assetAmount,
        xferAsset: assetXfer.xferAsset,
        fee: 0,
      })
      .submit()

    return createdListingApp.id
  }

  recordNegotiatedPrice(price: uint64, listingAppId: uint64): void {
    const listingApp = Application(listingAppId)
    assert(listingApp.creator === Global.currentApplicationAddress, NOT_A_LISTING)
    const listingContract = compileArc4(Listing)
    listingContract.call.recordNegotiatedPrice({
      appId: listingAppId,
      args: [price],
      fee: 0,
    })
  }

  purchase(payment: gtxn.PaymentTxn, listingAppId: uint64): void {
    const listingApp = Application(listingAppId)
    assert(listingApp.creator === Global.currentApplicationAddress, NOT_A_LISTING)
    assert(payment.receiver === Global.currentApplicationAddress, PAYMENT_RECEIVER_MUST_BE_CURRENT_APPLICATION_ADDRESS)
    assert(payment.amount > 0, PAYMENT_AMOUNT_MUST_BE_GREATER_THAN_0)

    const listingContract = compileArc4(Listing)

    // const seller = listingContract.call.getSeller({
    //   appId: listingApp.id,
    //   fee: 0,
    // }).returnValue

    const [sellerBytes] = op.AppGlobal.getExBytes(listingApp, Bytes(SELLER_KEY))
    const seller = Account(Bytes(sellerBytes))
    const purchasePayment = itxn.payment({
      receiver: listingApp.address,
      amount: payment.amount,
      fee: 0,
    })

    listingContract.call.purchase({
      onCompletion: OnCompleteAction.DeleteApplication,
      appId: listingApp.id,
      args: [purchasePayment, new Address(Txn.sender)],
      fee: 0,
    })

    itxn
      .payment({
        amount: Uint64(this.childContractMBR.value),
        receiver: seller,
        fee: 0,
      })
      .submit()
  }

  delist(listingAppId: uint64): void {
    const listingApp = Application(listingAppId)
    assert(listingApp.creator === Global.currentApplicationAddress, NOT_A_LISTING)

    const listingContract = compileArc4(Listing)

    listingContract.call.delist({
      onCompletion: OnCompleteAction.DeleteApplication,
      appId: listingApp.id,
      args: [new Address(Txn.sender)],
      fee: 0,
    })

    itxn
      .payment({
        amount: Uint64(this.childContractMBR.value),
        receiver: Txn.sender,
        fee: 0,
      })
      .submit()
  }

  /**
   * optin tells the contract to opt into an asa
   * @param payment The payment transaction
   * @param asset The asset to be opted into
   */
  public optinToListingAsset(payment: gtxn.PaymentTxn, asset: uint64): void {
    assert(payment.receiver === Global.currentApplicationAddress)
    assert(payment.amount === Global.assetOptInMinBalance)

    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        assetAmount: 0,
        xferAsset: asset,
        fee: 0,
      })
      .submit()
  }
}
