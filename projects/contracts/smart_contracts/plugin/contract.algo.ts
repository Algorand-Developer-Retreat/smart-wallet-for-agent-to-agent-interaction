import { Account, Application, Bytes, Contract, op } from '@algorandfoundation/algorand-typescript'

import { CONTROLLED_ADDRESS } from '../abstracted_account/constants'

export class Plugin extends Contract {
  protected getControlledAccount(app: Application): Account {
    const [controlledAccountBytes] = op.AppGlobal.getExBytes(app, Bytes(CONTROLLED_ADDRESS))
    return Account(Bytes(controlledAccountBytes))
  }
}
