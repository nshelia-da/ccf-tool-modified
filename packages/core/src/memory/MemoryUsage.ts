/*
 * © 2021 Thoughtworks, Inc.
 */

import { IUsageData } from '../index'

export default interface MemoryUsage extends IUsageData {
  readonly gigabyteHours: number
}
