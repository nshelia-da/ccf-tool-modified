import { PassThrough } from 'stream'
import { HeadObjectRequest, PutObjectRequest } from 'aws-sdk/clients/s3'
import path from 'path'
import { s3, decodeS3Key } from './s3'
import { Logger } from '@cloud-carbon-footprint/common'
import moment from 'moment'
const destinationBucket = process.env['AWS_S3_DESTINATION']
const sourceBucket = process.env['AWS_S3_SOURCE']
const logger = new Logger('report-processing')

function getHeadObjectOptions(key: string): HeadObjectRequest {
  key = decodeS3Key(key)
  return { Bucket: sourceBucket, Key: key.replace(/\\/g, '/') }
}

export async function getMessageKey(key: string, isLocalMode: boolean, isE2ETest: boolean): Promise<string> {

  let date = moment.utc(new Date())
  if (!isLocalMode && !isE2ETest) {
    const options = getHeadObjectOptions(key)
    const stats = await s3.headObject(options).promise()
    if (!stats.LastModified) {
      logger.info('Cant get a file info form the source s3')
    }
    date = moment.utc(stats.LastModified)
  }

  const parsedPath = path.parse(key.replace(/\\/g, '/'))
  let fileName = parsedPath.base
  if (!parsedPath.base.endsWith('.gz')) fileName = fileName + '.gz'
  const params: string[] = [
    `process_date=${date.year()}-${(date.month() + 1)
      .toString()
      .padStart(2, '0')}-${date.date()}`,
    parsedPath.dir,
  ]
  return path.join('result/', ...params, fileName)
}

export async function createDestinationStream(key: string, isLocalMode?: boolean, isE2ETest?: boolean) {
  const pass = new PassThrough()
  const params: PutObjectRequest = {
    Bucket: destinationBucket,
    Key: await getMessageKey(key,isLocalMode,isE2ETest),
    Body: pass,
  }
  return { promise: s3.upload(params).promise(), upload: pass }
}
