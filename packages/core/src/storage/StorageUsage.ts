/*
 * © 2021 Thoughtworks, Inc.
 */

import { IUsageData } from '../index'

export default interface StorageUsage extends IUsageData {
  readonly terabyteHours: number
}
