import * as dotenv from 'dotenv'
dotenv.config()
import { decodeS3Key, s3 } from './s3'
import { S3 } from 'aws-sdk'
import { MessageBody } from '../models'
const sourceBucket = process.env['AWS_S3_SOURCE']

export interface ManifestColumn {
  category: string
  name: string
  type: string
}
export interface ManifestBillingPeriod {
  start: string
  end: string
}
export interface ManifestFile {
  assemblyId: string
  account: string
  columns: ManifestColumn[]
  charset: string
  compression: string
  contentType: string
  reportId: string
  reportName: string
  billingPeriod: ManifestBillingPeriod
  bucket: string
  reportKeys: string[]
  additionalArtifactKeys: any[]
}

function createOptions(body: MessageBody): S3.Types.GetObjectRequest {
  const messageBody = body['Records'][0]
  const key = decodeS3Key(messageBody.s3.object.key || '')
  return { Bucket: sourceBucket, Key: key }
}
export async function fetchManifestFile(
  body: MessageBody,
): Promise<ManifestFile> {
  const options = createOptions(body)
  const manifestFile = await s3.getObject(options).promise()
  return JSON.parse(manifestFile.Body.toString('utf-8')) as ManifestFile
}
