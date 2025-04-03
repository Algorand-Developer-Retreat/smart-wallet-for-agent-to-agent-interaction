import { Account, Application, Bytes, Contract, op } from '@algorandfoundation/algorand-typescript'

const AbstractAccountGlobalStateKeysControlledAddress = 'controlled_address'

export class Plugin extends Contract {
  protected getControlledAccount(app: Application): Account {
    const [controlledAccountBytes] = op.AppGlobal.getExBytes(
      app,
      Bytes(AbstractAccountGlobalStateKeysControlledAddress),
    )
    return Account(Bytes(controlledAccountBytes))
  }
}
