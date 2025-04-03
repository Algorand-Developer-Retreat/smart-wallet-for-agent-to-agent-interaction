import { Application, Asset, Global, assert, gtxn, itxn, abimethod, uint64 } from "@algorandfoundation/algorand-typescript";
import { Plugin } from "../plugin/contract.algo";

export class OptInPlugin extends Plugin {

  optInToAsset(sender: uint64, rekeyBack: boolean, asset: uint64, mbrPayment: gtxn.PaymentTxn) {

    const controlledAccount = this.getControlledAccount(Application(sender));

    assert(mbrPayment.receiver === controlledAccount, 'receiver mismatch');
    assert(mbrPayment.amount >= Global.assetOptInMinBalance, 'asset mismatch');

    itxn
      .assetTransfer({
        sender: controlledAccount,
        assetReceiver: controlledAccount,
        assetAmount: 0,
        xferAsset: Asset(asset),
        rekeyTo: rekeyBack ? controlledAccount : Global.zeroAddress,
        fee: 0,
      })
      .submit();
  }
}
