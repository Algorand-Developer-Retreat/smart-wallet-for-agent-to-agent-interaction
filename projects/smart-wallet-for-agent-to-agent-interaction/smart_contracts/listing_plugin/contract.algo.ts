import { Contract } from '@algorandfoundation/algorand-typescript'

export class ListingPlugin extends Contract {
  public hello(name: string): string {
    return `Hello, ${name}`
  }
}
