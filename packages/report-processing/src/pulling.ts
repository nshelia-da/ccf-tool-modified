import { Logger } from '@cloud-carbon-footprint/common'
import { processMessage, processLocalFile } from './services/report-processing'

const { QueueServiceClient } = require('@azure/storage-queue')
const { BlobServiceClient } = require('@azure/storage-blob')

const logger = new Logger('report-processing')
const connectionString = process.env['AZURE_STORAGE_CONNECTION_STRING'] // replace with your Connection String
const queueName = process.env['AZURE_QUEUE_NAME'] // replace with your Queue name

export async function run({
  localMode,
  isConciseMode,
}: {
  localMode: boolean
  isConciseMode?: boolean
}) {
  logger.info('Listening for SQS queue')

  if (process.env.ENV === 'Azure') {
    const queueServiceClient =
      QueueServiceClient.fromConnectionString(connectionString)
    const queueClient = queueServiceClient.getQueueClient(queueName)

    const receiveResponse = await queueClient.receiveMessages()

    if (receiveResponse.receivedMessageItems.length == 1) {
      const receivedMessageItem = receiveResponse.receivedMessageItems[0]
      const messageObj = `${Buffer.from(
        receivedMessageItem.messageText,
        'base64',
      )}`
      console.log('message', JSON.parse(messageObj))
      await processMessage(messageObj, false)
    }
  }
}
