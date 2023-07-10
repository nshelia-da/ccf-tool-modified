import { SelectObjectContentRequest } from 'aws-sdk/clients/s3'
import { Readable } from 'stream'
import { decodeS3Key, s3 } from './s3'
import { transform } from 'stream-transform'
import { Logger } from '@cloud-carbon-footprint/common'
import * as path from 'path'
import fs from 'fs'
import { BlobServiceClient } from '@azure/storage-blob'

const sourceBucket = process.env['AWS_S3_SOURCE']
const logger = new Logger('report-processing')
export const ERROR_CANT_FIND_CONFIG = 'Cant find proper config for key: '

export function getInputSerialization(
  key: string,
): SelectObjectContentRequest['InputSerialization'] {
  const parsedPath = path.parse(key)
  const parquetConf = {
    Parquet: {},
  }
  const csvConf = {
    CSV: {
      FileHeaderInfo: 'NONE',
      RecordDelimiter: '\n',
      FieldDelimiter: ',',
    },
    CompressionType: parsedPath.ext.endsWith('.gz') ? 'GZIP' : 'NONE',
  }
  if (
    parsedPath.ext.toLowerCase().endsWith('.csv') ||
    parsedPath.ext.toLowerCase().endsWith('.gz')
  ) {
    return csvConf
  }
  if (parsedPath.ext.toLowerCase().endsWith('.parquet')) {
    return parquetConf
  }
  throw new Error(ERROR_CANT_FIND_CONFIG + key)
}

function getSelectOptions(key: string): SelectObjectContentRequest {
  return {
    Bucket: sourceBucket,
    Expression: `SELECT * FROM S3Object`,
    ExpressionType: 'SQL',
    InputSerialization: getInputSerialization(key),
    Key: decodeS3Key(key).replace(/\\/g, '/'),
    OutputSerialization: {
      CSV: {},
    },
  }
}

export async function createSourceStream(key: string): Promise<Readable> {
  if (process.env.ENV === 'Azure') {
    return await createSourceStreamAzure(key)
  }
  let params
  try {
    params = getSelectOptions(key)
    const data = await s3.selectObjectContent(params).promise()
    const streamMapper = transform((line, cb) => {
      try {
        const data = ((line || {}).Records || {}).Payload
        cb(null, data)
      } catch (err) {
        console.error(err)
        cb(err)
      }
    })
    const payload = data.Payload as Readable
    return payload.pipe(streamMapper)
  } catch (error) {
    logger.info(
      `Connection to s3 error: ${error.message}
       Params: ${JSON.stringify(params, null, 4)}`,
    )
    throw error
  }
}

const connectionString = process.env['AZURE_STORAGE_CONNECTION_STRING'] // you can get this from the Azure dashboard
const containerName = 'billing-export-container' // name of the container
const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString)

export async function createSourceStreamAzure(
  blobName: string,
): Promise<Readable> {
  const containerClient = blobServiceClient.getContainerClient(containerName)
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  const downloadBlockBlobResponse = await blockBlobClient.download()
  return downloadBlockBlobResponse.readableStreamBody as Readable
}

export async function createSourceStreamLocal(
  filename: string,
): Promise<Readable> {
  const payload = fs.createReadStream(path.join(__dirname, filename))
  return payload
}
