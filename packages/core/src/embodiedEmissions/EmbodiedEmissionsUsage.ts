/*
 * © 2021 Thoughtworks, Inc.
 */

import { IUsageData } from '../index'

export default interface EmbodiedEmissionsUsage extends IUsageData {
  instancevCpu: number
  largestInstancevCpu: number
  usageTimePeriod: number
  scopeThreeEmissions: number
}
