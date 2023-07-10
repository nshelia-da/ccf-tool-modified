import { Logger } from '@cloud-carbon-footprint/common'
import { waitMessages } from './services/queue'
import { processMessage, processLocalFile } from './services/report-processing'
const logger = new Logger('report-processing')

export async function run({ localMode, isConciseMode }: { localMode: boolean, isConciseMode?: boolean}) {
  logger.info('Listening for SQS queue')
  if (localMode) {
    const results = await processLocalFile({ isConciseMode})
  }  else {
    while (true) {
      try {
        const messages = await waitMessages()
        if (!messages.length) continue
        logger.info(`Got a ` + messages.length + ` messages: `)
        logger.info(messages.map(({ MessageId }) => MessageId).join(', '))
        const results = await Promise.all(
          messages.map((message) => processMessage(message, isConciseMode)),
        )
        logger.info(
          messages.length +
            ` messages processed with ` +
            results.filter(({ error }) => !!error).length +
            ` errors`,
        )
        results.forEach(({ error, message }) => {
          if (error) {
            logger.error(message, error)
          }
        })
      } catch (error) {
        logger.error('Cant processed messages, reason: ', error)
      }
    }
  }

}
