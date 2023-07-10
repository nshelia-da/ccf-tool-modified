// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ERROR_MESSAGE, processMessage } from '../../services/report-processing'
import { MessageBody } from '../../models'
import { createReadStream, createWriteStream } from 'fs'
import * as fs from 'fs'
import { App } from '@cloud-carbon-footprint/app'
import * as path from 'path'
import { gunzipSync } from 'zlib'
import { deleteMessage } from '../../services/queue'
import { createSourceStream } from '../../services/source'
import { createDestinationStream } from '../../services/destination'
import { finished } from 'stream/promises'
import { AccountType } from '@cloud-carbon-footprint/core'

let keys: string[] = []

const createMessageBody: (
  accountType: AccountType,
  keys?: string[],
) => string = (accountType: AccountType, keys = ['test']) =>
  JSON.stringify({
    files: keys,
    accountType,
  } as MessageBody)

jest.mock('../../services/queue', () => {
  return { deleteMessage: jest.fn() }
})

jest.mock('../../services/source', () => {
  return {
    createSourceStream: jest.fn((filePath: string) => {
      return createReadStream(filePath)
    }),
  }
})

function createDestPath(filePath: string): string {
  const p = path.parse(filePath)
  return path.join(p.dir, 'result_' + p.base)
}

jest.mock('../../services/destination', () => {
  return {
    createDestinationStream: jest.fn((filePath: string) => {
      const stream = createWriteStream(createDestPath(filePath))
      return {
        upload: stream,
        promise: finished(stream),
      }
    }),
  }
})

beforeEach(() => {
  keys = []
})

afterEach(() => {
  const app = new App()
  app.setAccumulatedData(
    {
      total: {},
    },
    'Aws',
  )
  app.setAccumulatedData(
    {
      total: {},
    },
    'Azure',
  )
  try {
    keys.forEach((fp) => {
      fp = createDestPath(fp)
      fs.existsSync(fp) && fs.unlinkSync(fp)
    })
  } catch (err) {
    console.log(err)
  }
})

function checkCreatedFiles() {
  for (const key of keys) {
    const destFilePath = createDestPath(key)
    expect(fs.existsSync(destFilePath)).toBe(true)
    expect(
      gunzipSync(fs.readFileSync(destFilePath)).toString(),
    ).toMatchSnapshot()
  }
}

describe('report-processing', () => {
  it(`Testing message which can't be processed`, async () => {
    const result = await processMessage({
      Body: createMessageBody('Aws', null),
    })
    expect(result.error).toBeDefined()
    expect(result.error.slice(0, ERROR_MESSAGE.length)).toBe(ERROR_MESSAGE)
  })

  it(`Testing message which can't be processed`, async () => {
    const result = await processMessage({
      Body: createMessageBody(null, []),
    })
    expect(result.error).toBeDefined()
    expect(result.error.slice(0, ERROR_MESSAGE.length)).toBe(ERROR_MESSAGE)
  })

  it(`Testing smoke data set`, async () => {
    keys = [path.join(__dirname, 'test_good_all.csv')]
    const result = await processMessage({
      Body: createMessageBody('Aws', keys),
    })
    expect(deleteMessage).toBeCalled()
    expect(createSourceStream).toBeCalled()
    expect(createDestinationStream).toBeCalled()
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })

  it(`Testing escaped string`, async () => {
    keys = [path.join(__dirname, 'test_escape_string.csv')]
    const result = await processMessage({
      Body: createMessageBody('Aws', keys),
    })
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })

  it(`Testing good known rows`, async () => {
    keys = [path.join(__dirname, 'test_good_known.csv')]
    const result = await processMessage({
      Body: createMessageBody('Aws', keys),
    })
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })

  it(`Testing unknown data WITHOUT accumulated data`, async () => {
    keys = [path.join(__dirname, 'test_unknown_no_estimates.csv')]
    const result = await processMessage({
      Body: createMessageBody('Aws', keys),
    })
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })

  it(`Testing unknown data WITH accumulated data`, async () => {
    keys = [path.join(__dirname, 'test_unknown_estimates.csv')]
    const result = await processMessage({
      Body: createMessageBody('Aws', keys),
    })
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })

  it(`Testing with many headers`, async () => {
    keys = [path.join(__dirname, 'test_many_headers.csv')]
    const result = await processMessage({
      Body: createMessageBody('Aws', keys),
    })
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })

  it(`Testing multiple files`, async () => {
    keys = [
      path.join(__dirname, 'test_good_all.csv'),
      path.join(__dirname, 'test_good_known.csv'),
    ]
    const result = await processMessage({
      Body: createMessageBody('Aws', keys),
    })
    expect(deleteMessage).toBeCalled()
    expect(createSourceStream).toBeCalled()
    expect(createDestinationStream).toBeCalled()
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })

  it(`Testing Azure report`, async () => {
    keys = [path.join(__dirname, 'azure_good_all.csv')]
    const result = await processMessage({
      Body: createMessageBody('Azure', keys),
    })
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })

  it(`Testing NaN field escaping `, async () => {
    keys = [path.join(__dirname, 'aws_nan_fields.csv')]
    const result = await processMessage({
      Body: createMessageBody('Aws', keys),
    })
    expect(result.error).toBeUndefined()
    checkCreatedFiles()
  })
})
