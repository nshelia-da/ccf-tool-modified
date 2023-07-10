// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { createServer } from '../health-check'
import * as http from 'http'

const serverMock = { listen: jest.fn() }
let callback: (
  arg0: { url: string },
  arg1: { end: jest.Mock<any, any>; writeHead: jest.Mock<any, any> },
) => void

jest.mock('http', () => ({
  createServer: jest.fn((cb) => {
    callback = cb
    return serverMock
  }),
}))

describe('health check', () => {
  beforeAll(() => {
    createServer()
  })

  it('The http server is initiated', async () => {
    expect(http.createServer).toHaveBeenCalledTimes(1)
    expect(serverMock.listen).toHaveBeenCalledTimes(1)
  })

  it('return correct response from server callback', () => {
    const res = {
      end: jest.fn(),
      writeHead: jest.fn(),
    }
    callback({ url: '/unknown/url/' }, res)
    expect(res.end).toHaveBeenCalledTimes(1)
    expect(res.writeHead).toHaveBeenCalledTimes(1)
    expect(res.end).toHaveBeenLastCalledWith('Bad request')
    expect(res.writeHead).toHaveBeenLastCalledWith(400)

    const resGood = {
      end: jest.fn(),
      writeHead: jest.fn(),
    }
    callback({ url: '/health-check' }, resGood)
    expect(resGood.end).toHaveBeenCalledTimes(1)
    expect(resGood.writeHead).toHaveBeenCalledTimes(0)
    expect(resGood.end).toHaveBeenLastCalledWith('It works!')
  })
})
