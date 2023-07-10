/*
 * © 2021 Thoughtworks, Inc.
 */

import { IUsageData } from '../index'

export default interface NetworkingUsage extends IUsageData {
  readonly gigabytes: number
}
