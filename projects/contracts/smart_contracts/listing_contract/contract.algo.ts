import {
  abimethod,
  Account,
  assert,
  Asset,
  GlobalState,
  gtxn,
  itxn,
  uint64,
} from '@algorandfoundation/algorand-typescript'
import { Address, Contract } from '@algorandfoundation/algorand-typescript/arc4'
import { Global, Txn } from '@algorandfoundation/algorand-typescript/op'

// Import individual constants
import {
  ASSET_KEY,
  MUST_BE_CALLED_FROM_FACTORY,
  NEGOTIATED_PRICE_KEY,
  ONLY_SELLER_CAN_DELIST,
  PRICE_KEY,
  PRICE_NOT_NEGOTIATED,
  SELLER_KEY,
} from './constants'

export type Royalties = {
  creator: uint64
  marketplace: uint64
}

export class Listing extends Contract {
  /** the asset for sale */
  asset = GlobalState<Asset>({ key: ASSET_KEY })

  negotiatedPrice = GlobalState<uint64>({ initialValue: 0, key: NEGOTIATED_PRICE_KEY })

  /** the address selling the asset */
  seller = GlobalState<Address>({ key: SELLER_KEY })

  private transferPurchaseToBuyer(buyer: Account): void {
    // transfer asa to buyer
    if (buyer.isOptedIn(this.asset.value)) {
      // transfer the purchase to the caller & opt out of the asset
      itxn
        .assetTransfer({
          assetCloseTo: buyer,
          assetReceiver: buyer,
          assetAmount: this.asset.value.balance(Global.currentApplicationAddress),
          xferAsset: this.asset.value,
          fee: 0,
        })
        .submit()
    }
  }

  private completeAlgoPayments(): void {
    // pay the seller
    const sellerPay = itxn
      .payment({
        closeRemainderTo: this.seller.value.native,
        fee: 0,
        note: this.asset.value.name.toString() + ' Sold',
      })
      .submit()
  }

  /**
   * create the listing application
   * @param {uint64} asset the asa ID that is to be sold
   * @param {Address} seller the wallet of the account selling the asset
   * @throws {Error} - if the caller is not the factory
   */
  // @ts-ignore
  @abimethod({ onCreate: 'require' })
  public createApplication(asset: Asset, seller: Address): void {
    assert(Global.callerApplicationId !== 0, MUST_BE_CALLED_FROM_FACTORY)

    this.asset.value = asset
    this.seller.value = seller
  }

  public recordNegotiatedPrice(price: uint64): void {
    assert(Txn.sender === Global.creatorAddress, MUST_BE_CALLED_FROM_FACTORY)
    this.negotiatedPrice.value = price
  }

  /**
   * optin tells the contract to opt into an asa
   * @param payment The payment transaction
   * @param asset The asset to be opted into
   */
  public optinToListingAsset(payment: gtxn.PaymentTxn, asset: uint64): void {
    assert(Txn.sender === Global.creatorAddress, 'optinToListingAsset must be called by creator')
    assert(payment.receiver === Global.currentApplicationAddress, 'payment receiver must be this app')
    assert(payment.amount === (Global.assetOptInMinBalance * 2), 'payment amount must be asset optin min balance + min account mbr')

    itxn
      .assetTransfer({
        assetReceiver: Global.currentApplicationAddress,
        assetAmount: 0,
        xferAsset: asset,
        fee: 0,
      })
      .submit()
  }

  /**
   * @param {PayTxn} payment - the payment for purchasing the asset
   * @param {Address} buyer - the buyer of the asset
   * @throws {Error} - if the caller is not the reserved address
   * @throws {Error} - if the payment is not correct
   */
  // @ts-ignore
  @abimethod({ allowActions: 'DeleteApplication' })
  public purchase(payment: gtxn.PaymentTxn, buyer: Address): void {
    assert(Txn.sender === Global.creatorAddress, MUST_BE_CALLED_FROM_FACTORY)
    assert(this.negotiatedPrice.value > 0, PRICE_NOT_NEGOTIATED)

    assert(payment.sender === Global.creatorAddress)
    assert(payment.amount === this.negotiatedPrice.value)
    assert(payment.receiver === Global.currentApplicationAddress)

    this.transferPurchaseToBuyer(buyer.native)
    this.completeAlgoPayments()
  }

  /**
   * Deletes the app and returns the asset/mbr to the seller
   */
  // @ts-ignore
  @abimethod({ allowActions: 'DeleteApplication' })
  delist(caller: Address): void {
    assert(Txn.sender === Global.creatorAddress, MUST_BE_CALLED_FROM_FACTORY)
    assert(this.seller.value === caller, ONLY_SELLER_CAN_DELIST)

    const assetTransfer = itxn.assetTransfer({
      assetReceiver: this.seller.value.native,
      assetCloseTo: this.seller.value.native,
      xferAsset: this.asset.value,
      fee: 0,
    })

    const payment = itxn.payment({
      closeRemainderTo: this.seller.value.native,
      fee: 0,
    })

    itxn.submitGroup(assetTransfer, payment)
  }

  @abimethod({ readonly: true })
  public getSeller(): Address {
    return this.seller.value
  }
}
