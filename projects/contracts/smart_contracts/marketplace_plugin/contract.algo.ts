import { Contract } from '@algorandfoundation/algorand-typescript'

export class MarketplacePlugin extends Contract {
  public hello(name: string): string {
    return `Hello, ${name}`
  }
}
