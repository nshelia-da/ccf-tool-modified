import * as dotenv from 'dotenv'
import { createServer } from '../health-check'
import { run } from '../pulling'
export * from '../index'

jest.mock('dotenv')
jest.mock('../health-check')
jest.mock('../pulling')

describe('report-processing', () => {
  it('Check initial calls for entry point', async () => {
    expect(dotenv.config).toHaveBeenCalledTimes(1)
    expect(createServer).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
