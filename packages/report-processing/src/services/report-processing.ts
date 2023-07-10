import { Message } from 'aws-sdk/clients/sqs'
import { MessageBody, MessageProcessedResult } from '../models'
import { createSourceStream, createSourceStreamLocal } from './source'
import { createDestinationStream } from './destination'
import { deleteMessage } from './queue'
import { App } from '@cloud-carbon-footprint/app'
import { Readable, Writable } from 'stream'
import { parse } from 'csv-parse'
import {
  IMapper,
  IMapperFactory,
  AccountType,
} from '@cloud-carbon-footprint/core'
import { createMapperFactory } from '../mapper'
import { transform } from './stream-transform'
import { pipeline } from 'stream/promises'
import { stringify } from 'csv-stringify'
import { createGzip } from 'zlib'
import { Logger } from '@cloud-carbon-footprint/common'
import moment from 'moment'
import { readFileSync } from 'fs'
const logger = new Logger('report-processing')
enum Headers {
  APPLICATION_VERSION_COLUMN_NAME = 'ccf_version',
  CO2E_COLUMN_NAME = 'co2e',
  KWH_COLUMN_NAME = 'kilowattHours',
}
const HEADERS: Headers[] = [
  Headers.KWH_COLUMN_NAME,
  Headers.CO2E_COLUMN_NAME,
  Headers.APPLICATION_VERSION_COLUMN_NAME,
]
export const ERROR_MESSAGE = `Can't process message with`

const VALIDATORS: Record<Headers, (value: any) => string | null> = {
  [Headers.CO2E_COLUMN_NAME]: (value) => {
    if (isNaN(value)) {
      return null
    }
    if (value == null) return null
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return null
    }
    return `CCF tool calculated incorrect co2e ${value}`
  },
  [Headers.KWH_COLUMN_NAME]: (value) => {
    if (value == null) return null
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return null
    }
    return `CCF tool calculated incorrect kwHs ${value}`
  },
  [Headers.APPLICATION_VERSION_COLUMN_NAME]: () => null,
}

const DEFAULT_VALUES: Record<Headers, any> = {
  [Headers.KWH_COLUMN_NAME]: 0,
  [Headers.CO2E_COLUMN_NAME]: 0,
  [Headers.APPLICATION_VERSION_COLUMN_NAME]: '0.0.0',
}

function getValidator(header: Headers) {
  return VALIDATORS[header]
}
function getDefaultValue(header: Headers) {
  return DEFAULT_VALUES[header]
}
function escapeValues(data: IMapper, logger: Logger) {
  HEADERS.forEach((header) => {
    const validator = getValidator(header)
    const value = data.get(header)
    const error = validator(value)
    if (error) {
      logger.warn(error)
      const defaultValue = getDefaultValue(header)
      data.set(header, defaultValue)
    }
  })
}

class StopWatch {
  private static now: Date
  static start() {
    this.now = new Date()
  }
  static stop(): string {
    const then = new Date()
    return moment.utc(moment(then).diff(moment(this.now))).format('HH:mm:ss')
  }
}

function createLogger(message: string) {
  let counter = 0
  const num = parseFloat(process.env['LOGGER_LOG_EVERY_N_ROW']) || 50000
  return () => {
    counter++
    if (counter % num === 0) {
      logger.info(`${message}, calls: ${counter}`)
    }
  }
}

function parseMessageBody(bodyStr: string): MessageBody {
  return JSON.parse(bodyStr) as MessageBody
}

export function getAccountType(body: MessageBody): AccountType {
  return body.accountType ?? 'Aws'
}

export async function processMessage(
  message: any,
  isConciseMode?: boolean,
): Promise<MessageProcessedResult> {
  try {
    // .Body has only AWS messages
    const body = parseMessageBody(message.Body || message)
    console.log('body', body)
    if (!canProcess(body)) {
      return {
        error: `${ERROR_MESSAGE}
      ${JSON.stringify(message, null, 4)}`,
      }
    }
    logger.info('Try to read a manifest file from ' + body?.manifest)

    const accountType = getAccountType(body)
    const files = body.files
    const isE2ETest = !!body.isE2ETest
    const app: App = await new App()
    console.log('AccountTypes', accountType)
    // Accumulate the data for unknown rows
    for (const key of files) {
      logger.info('Accumulate data from the file: ' + key)
      const readForAccumulation = await createSourceStream(key)
      await getAccumulateData(
        readForAccumulation,
        app,
        accountType,
        isConciseMode,
      )
    }
    return {}

    const accData = app.getAccumulatedData(accountType)

    // Enrich all rows
    for (const key of files) {
      StopWatch.start()
      logger.info('Enrich data in file: ' + key)
      const readForEnrichment = await createSourceStream(key)

      const { upload, promise } = await createDestinationStream(
        key,
        false,
        isE2ETest,
      )
      const [, { amountOfRows }] = await Promise.all([
        promise,
        enrichReport(
          app,
          accountType,
          readForEnrichment,
          upload,
          accData,
          isConciseMode,
        ),
      ])
      const timeTakes = StopWatch.stop()
      logger.info(
        `Processing the file: ${key} with ${amountOfRows}  is DONE! in ${timeTakes} (HH:MM:SS)`,
      )
    }

    await deleteMessage(message)
    return {}
  } catch (error) {
    console.log('Error', error)
    const messageID = message?.MessageId
    return {
      message: `[${messageID}] Processing messsage error: ` + error.message,
      error,
    }
  }
}

function canProcess(body: MessageBody): boolean {
  return !!body?.files && !!body?.accountType
}

async function getAccumulateData(
  input: Readable,
  app: App,
  providerType: AccountType,
  isConciseMode?: boolean,
): Promise<any> {
  try {
    const readline = parse({
      delimiter: ',',
      relax_column_count: true,
    })

    const callback = (() => {
      let firstLine = true
      let mf: IMapperFactory
      return (line: string[]) => {
        if (firstLine) {
          mf = createMapperFactory([...line], isConciseMode)
        } else {
          app.accumulateKnownRowData(mf.create(line), providerType)
        }
        firstLine = false
      }
    })()

    const log = createLogger('Amount of enriched records')
    const enricher = transform((line: string[], cb: (arg0: any) => void) => {
      try {
        enricher.state.running
        callback(line)
        cb(null)
        log()
      } catch (err) {
        console.error(err)
        cb(err)
      }
    })

    const pipe = pipeline(input, readline, enricher)

    await pipe
  } catch (err) {
    console.error('Failed to use streams', err)
    throw err
  }
}

let version = '0.0.0'
try {
  version = JSON.parse(readFileSync('package.json').toString()).version
} catch (err) {
  logger.info("Can't get the version, use default one")
}

function setAppVersion(mapper: IMapper): IMapper {
  mapper.set(Headers.APPLICATION_VERSION_COLUMN_NAME, version)
  return mapper
}

async function enrichReport(
  app: App,
  providerType: AccountType,
  input: Readable,
  destination: Writable,
  accData: Record<string, unknown>,
  isConciseMode?: boolean,
): Promise<{ amountOfRows: number }> {
  let amountOfRows = 0
  const enrichRows = (app: App) => {
    let mf: IMapperFactory
    let firstLine = true
    return (line: string[]) => {
      amountOfRows++
      if (firstLine) {
        mf = createMapperFactory([...line, ...HEADERS], isConciseMode)
        firstLine = false
        return mf.getHeaderLine()
      }
      const res: IMapper = app.getCostAndEstimateSingleRow(
        mf.create(line),
        providerType,
      )
      setAppVersion(res)
      escapeValues(res, logger)
      return res.getLine()
    }
  }
  const callback = enrichRows(app)
  app.setAccumulatedData(accData, providerType)

  try {
    const readline = parse({
      delimiter: ',',
    })
    const log = createLogger('Amount of enriched records')
    const enricher = transform(
      (line: string[], cb: (arg0: any, arg1?: string[]) => void) => {
        try {
          const res = callback(line)
          cb(null, res)
          log()
        } catch (err) {
          console.error(err)
          cb(err)
        }
      },
    )
    const stringifier = stringify({ delimiter: ',' })

    const pipe = pipeline(
      input,
      readline,
      enricher,
      stringifier,
      createGzip(),
      destination,
    )

    await pipe
    return { amountOfRows }
  } catch (err) {
    console.error('Failed to use streams', err)
    throw err
  }
}

export async function processLocalFile({
  isConciseMode,
}: {
  isConciseMode: boolean
}) {
  const accountType = 'Aws'
  const app: App = await new App()

  // Accumulate the data for unknown rows
  const fileName = './sample55.csv'
  const destKey =
    'curReport/reports/carbon_emission_tool_cg-report/sample-concise.csv.gz'

  logger.info('Accumulate data from the file: ' + fileName)
  const readForAccumulation = await createSourceStreamLocal(fileName)
  await getAccumulateData(readForAccumulation, app, accountType, isConciseMode)

  const accData = app.getAccumulatedData(accountType)
  // Enrich all rows
  StopWatch.start()
  logger.info('Enrich data in file: ' + fileName)
  const readForEnrichment = await createSourceStreamLocal(fileName)

  const { upload, promise } = await createDestinationStream(destKey, true)
  const [, { amountOfRows }] = await Promise.all([
    promise,
    enrichReport(
      app,
      accountType,
      readForEnrichment,
      upload,
      accData,
      isConciseMode,
    ),
  ])
  const timeTakes = StopWatch.stop()
  logger.info(
    `Processing the file: ${destKey} with ${amountOfRows}  is DONE! in ${timeTakes} (HH:MM:SS)`,
  )
}
