import { TestExecutionContext } from '@algorandfoundation/algorand-typescript-testing'
import { describe, expect, it } from 'vitest'
import { MarketplacePlugin } from './contract.algo'

describe('MarketplacePlugin contract', () => {
  const ctx = new TestExecutionContext()
  it('Logs the returned value when sayHello is called', () => {
    const contract = ctx.contract.create(MarketplacePlugin)

    const result = contract.hello('Sally')

    expect(result).toBe('Hello Sally')
  })
})
