import * as AWS from 'aws-sdk'
import {
  Message,
  MessageList,
  ReceiveMessageRequest,
} from 'aws-sdk/clients/sqs'
import { Logger } from '@cloud-carbon-footprint/common'
const apiVersion = process.env['AWS_API_VERSION'] || '2012-11-05'
const queueURL = process.env['AWS_QUEUE_URL']
const region = process.env['AWS_REGION'] || 'eu-west-2'
const logger = new Logger('sqs-service')

const sqs = new AWS.SQS({ apiVersion, region })
const THREADS = 1
const queueParams: ReceiveMessageRequest = {
  QueueUrl: queueURL,
  WaitTimeSeconds: 20,
  MaxNumberOfMessages: THREADS,
}

const RETRY_DELAY = 20000

export async function waitMessages(): Promise<MessageList> {
  try {
    const data = await sqs.receiveMessage(queueParams).promise()
    const { Messages: messages } = data || {}
    return messages || []
  } catch (error) {
    logger.error(
      `
      Error while receiving messages, will try in ${RETRY_DELAY / 1000} sec 
      ${JSON.stringify(queueParams)}`,
      error,
    )
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve(waitMessages()), RETRY_DELAY)
  })
}

export async function deleteMessage(message: Message) {
  const params = {
    QueueUrl: queueURL,
    ReceiptHandle: message.ReceiptHandle,
  }
  try {
    await sqs.deleteMessage(params).promise()
  } catch (error) {
    throw error
  }
}
