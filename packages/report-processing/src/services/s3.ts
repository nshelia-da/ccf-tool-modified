import * as AWS from 'aws-sdk'
import path from 'path'

const region = process.env['AWS_REGION'] || 'eu-west-2'
export const s3 = new AWS.S3({ region })

export const decodeS3Key = (key: string): string => {
  const parsedKey = path.parse(key)
  const baseDecode = (key: string) =>
    decodeURIComponent(key.replaceAll('+', ' ').replaceAll('%2B', '+'))
  const name = baseDecode(parsedKey.name)
  const dir = parsedKey.dir.split(path.sep).map(baseDecode)
  return path.join(...dir, name + parsedKey.ext)
}
