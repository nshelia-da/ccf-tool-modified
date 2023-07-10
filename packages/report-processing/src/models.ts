import { AccountType } from '@cloud-carbon-footprint/core'

export interface MessageBody {
  files?: string[]
  manifest?: string
  accountType: AccountType
  isE2ETest: boolean
}

export type MessageProcessedResult = { error?: any; message?: string }
