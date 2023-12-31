/*
 * © 2021 Thoughtworks, Inc.
 */
import {
  CloudConstantsByProvider,
  CloudConstantsEmissionsFactors,
  COMPUTE_PROCESSOR_TYPES,
  EstimateUnknownUsageBy,
  getWattsByAverageOrMedian,
} from '@cloud-carbon-footprint/core'

import {
  GCP_DUAL_REGIONS,
  GCP_MULTI_REGIONS,
  GCP_REGIONS,
} from '../lib/GCPRegions'
import { configLoader } from '@cloud-carbon-footprint/common'

export const GCP_CLOUD_CONSTANTS: CloudConstantsByProvider = {
  SSDCOEFFICIENT: 1.2, // watt hours / terabyte hour
  HDDCOEFFICIENT: 0.65, // watt hours / terabyte hour
  MIN_WATTS_MEDIAN: 0.68,
  MIN_WATTS_BY_COMPUTE_PROCESSOR: {
    // CPUs
    [COMPUTE_PROCESSOR_TYPES.CASCADE_LAKE]: 0.64,
    [COMPUTE_PROCESSOR_TYPES.SKYLAKE]: 0.65,
    [COMPUTE_PROCESSOR_TYPES.BROADWELL]: 0.71,
    [COMPUTE_PROCESSOR_TYPES.HASWELL]: 1,
    [COMPUTE_PROCESSOR_TYPES.COFFEE_LAKE]: 1.14,
    [COMPUTE_PROCESSOR_TYPES.SANDY_BRIDGE]: 2.17,
    [COMPUTE_PROCESSOR_TYPES.IVY_BRIDGE]: 3.04,
    [COMPUTE_PROCESSOR_TYPES.AMD_EPYC_1ST_GEN]: 0.82,
    [COMPUTE_PROCESSOR_TYPES.AMD_EPYC_2ND_GEN]: 0.47,
    [COMPUTE_PROCESSOR_TYPES.AMD_EPYC_3RD_GEN]: 0.45,
    // GPUs
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_K520]: 26,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_A10G]: 18,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_T4]: 8,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_M60]: 35,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_K80]: 35,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_V100]: 35,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_A100]: 46,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_P4]: 9,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_P100]: 36,
    [COMPUTE_PROCESSOR_TYPES.AMD_RADEON_PRO_V520]: 26,
  },
  getMinWatts: (computeProcessors: string[]): number => {
    const minWattsForProcessors: number[] = computeProcessors.map(
      (processor: string) => {
        return GCP_CLOUD_CONSTANTS.MIN_WATTS_BY_COMPUTE_PROCESSOR[processor]
      },
    )
    const wattsForProcessors: number = getWattsByAverageOrMedian(
      computeProcessors,
      minWattsForProcessors,
    )
    return wattsForProcessors
      ? wattsForProcessors
      : GCP_CLOUD_CONSTANTS.MIN_WATTS_MEDIAN
  },
  MAX_WATTS_MEDIAN: 4.11,
  MAX_WATTS_BY_COMPUTE_PROCESSOR: {
    // CPUs
    [COMPUTE_PROCESSOR_TYPES.CASCADE_LAKE]: 3.97,
    [COMPUTE_PROCESSOR_TYPES.SKYLAKE]: 4.26,
    [COMPUTE_PROCESSOR_TYPES.BROADWELL]: 3.69,
    [COMPUTE_PROCESSOR_TYPES.HASWELL]: 4.74,
    [COMPUTE_PROCESSOR_TYPES.COFFEE_LAKE]: 5.42,
    [COMPUTE_PROCESSOR_TYPES.SANDY_BRIDGE]: 8.58,
    [COMPUTE_PROCESSOR_TYPES.IVY_BRIDGE]: 8.25,
    [COMPUTE_PROCESSOR_TYPES.AMD_EPYC_1ST_GEN]: 2.55,
    [COMPUTE_PROCESSOR_TYPES.AMD_EPYC_2ND_GEN]: 1.69,
    [COMPUTE_PROCESSOR_TYPES.AMD_EPYC_3RD_GEN]: 2.02,
    // GPUs
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_K520]: 229,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_A10G]: 153,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_T4]: 71,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_M60]: 306,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_K80]: 306,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_V100]: 306,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_A100]: 407,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_P4]: 76.5,
    [COMPUTE_PROCESSOR_TYPES.NVIDIA_TESLA_P100]: 306,
    [COMPUTE_PROCESSOR_TYPES.AMD_RADEON_PRO_V520]: 229,
  },
  getMaxWatts: (computeProcessors: string[]): number => {
    const maxWattsForProcessors: number[] = computeProcessors.map(
      (processor: string) => {
        return GCP_CLOUD_CONSTANTS.MAX_WATTS_BY_COMPUTE_PROCESSOR[processor]
      },
    )
    const wattsForProcessors: number = getWattsByAverageOrMedian(
      computeProcessors,
      maxWattsForProcessors,
    )

    return wattsForProcessors
      ? wattsForProcessors
      : GCP_CLOUD_CONSTANTS.MAX_WATTS_MEDIAN
  },
  NETWORKING_COEFFICIENT: 0.001, // kWh / Gb
  MEMORY_COEFFICIENT: 0.000392, // kWh / Gb
  PUE_AVG: 1.1,
  PUE_TRAILING_TWELVE_MONTH: {
    [GCP_REGIONS.US_EAST4]: 1.08,
    [GCP_REGIONS.US_CENTRAL1]: 1.11,
    [GCP_REGIONS.US_CENTRAL2]: 1.11,
    [GCP_REGIONS.EUROPE_WEST1]: 1.09,
    [GCP_REGIONS.EUROPE_WEST4]: 1.07,
    [GCP_REGIONS.EUROPE_NORTH1]: 1.09,
    [GCP_REGIONS.ASIA_EAST1]: 1.12,
    [GCP_REGIONS.ASIA_SOUTHEAST1]: 1.13,
  },
  getPUE: (region: string): number => {
    // Return region-specific PUE if available, otherwise use fleet-wide average
    return GCP_CLOUD_CONSTANTS.PUE_TRAILING_TWELVE_MONTH[region]
      ? GCP_CLOUD_CONSTANTS.PUE_TRAILING_TWELVE_MONTH[region]
      : GCP_CLOUD_CONSTANTS.PUE_AVG
  },
  AVG_CPU_UTILIZATION_2020: 50,
  REPLICATION_FACTORS: {
    CLOUD_STORAGE_SINGLE_REGION: 2,
    CLOUD_STORAGE_DUAL_REGION: 2,
    CLOUD_STORAGE_MULTI_REGION: 2,
    COMPUTE_ENGINE_REGIONAL_DISKS: 2,
    CLOUD_FILESTORE: 2,
    CLOUD_SQL_HIGH_AVAILABILITY: 2,
    CLOUD_MEMORY_STORE_REDIS: 2,
    CLOUD_SPANNER_SINGLE_REGION: 2,
    CLOUD_SPANNER_MULTI_REGION: 2,
    KUBERNETES_ENGINE: 3,
    DEFAULT: 1,
  },
  // these constants accumulate as the usage rows are mapped over
  KILOWATT_HOURS_BY_SERVICE_AND_USAGE_UNIT: {
    total: {},
  },
  ESTIMATE_UNKNOWN_USAGE_BY: EstimateUnknownUsageBy.USAGE_AMOUNT,
  SERVER_EXPECTED_LIFESPAN: 35040, // 4 years in hours
}

export const getGCPEmissionsFactors = (): CloudConstantsEmissionsFactors => {
  // These emission factors take into account Google Carbon Free Energy percentage in each region. Source: https://cloud.google.com/sustainability/region-carbon
  if (configLoader().GCP.USE_CARBON_FREE_ENERGY_PERCENTAGE)
    return {
      [GCP_REGIONS.US_CENTRAL1]: 0.0002152373529,
      [GCP_REGIONS.US_CENTRAL2]: 0.0002152373529,
      [GCP_REGIONS.US_EAST1]: 0.0003255,
      [GCP_REGIONS.US_EAST4]: 0.00011124,
      [GCP_REGIONS.US_EAST5]: 0.00011124,
      [GCP_REGIONS.US_WEST1]: 0.0000072,
      [GCP_REGIONS.US_WEST2]: 0.0000893,
      [GCP_REGIONS.US_WEST3]: 0.00030912,
      [GCP_REGIONS.US_WEST4]: 0.00028835,
      [GCP_REGIONS.US_SOUTH1]: 0.0001776,
      [GCP_REGIONS.ASIA_EAST1]: 0.00037848,
      [GCP_REGIONS.ASIA_EAST2]: 0.0002592,
      [GCP_REGIONS.ASIA_NORTHEAST1]: 0.00038976,
      [GCP_REGIONS.ASIA_NORTHEAST2]: 0.00026496,
      [GCP_REGIONS.ASIA_NORTHEAST3]: 0.00029325,
      [GCP_REGIONS.ASIA_SOUTH1]: 0.000603,
      [GCP_REGIONS.ASIA_SOUTH2]: 0.00061732,
      [GCP_REGIONS.ASIA_SOUTHEAST1]: 0.00035712,
      [GCP_REGIONS.ASIA_SOUTHEAST2]: 0.0005046,
      [GCP_REGIONS.AUSTRALIA_SOUTHEAST1]: 0.00047242,
      [GCP_REGIONS.AUSTRALIA_SOUTHEAST2]: 0.00035949,
      [GCP_REGIONS.EUROPE_CENTRAL2]: 0.0004608,
      [GCP_REGIONS.EUROPE_NORTH1]: 0.00001143,
      [GCP_REGIONS.EUROPE_SOUTHWEST1]: 0.000121,
      [GCP_REGIONS.EUROPE_WEST1]: 0.0000198,
      [GCP_REGIONS.EUROPE_WEST2]: 0.00007396,
      [GCP_REGIONS.EUROPE_WEST3]: 0.0001076,
      [GCP_REGIONS.EUROPE_WEST4]: 0.00013301,
      [GCP_REGIONS.EUROPE_WEST6]: 0.0000129,
      [GCP_REGIONS.EUROPE_WEST8]: 0.000298,
      [GCP_REGIONS.EUROPE_WEST9]: 0.000059,
      [GCP_REGIONS.NORTHAMERICA_NORTHEAST1]: 0, // Montreal is 100% CFE
      [GCP_REGIONS.NORTHAMERICA_NORTHEAST2]: 0.00000232,
      [GCP_REGIONS.SOUTHAMERICA_EAST1]: 0.00002838,
      [GCP_REGIONS.SOUTHAMERICA_WEST1]: 0.0000589,
      [GCP_DUAL_REGIONS.ASIA1]: 0.00065472, // Sum of asia-northeast1 + asia-northeast2
      [GCP_DUAL_REGIONS.EUR4]: 0.00014444, // Sum of europe-west4 + europe-north1
      [GCP_DUAL_REGIONS.NAM4]: 0.00033732, // Sum of us-central1 + us-east1
      [GCP_MULTI_REGIONS.ASIA]: 0.00139032, // Sum of region group data centers within Asia
      [GCP_MULTI_REGIONS.EU]: 0.00121064, // Sum of region group data centers within EU
      [GCP_MULTI_REGIONS.US]: 0.00143137, // Sum of all US data centers
      [GCP_REGIONS.UNKNOWN]: 0.0002152373529, // Average across all regions (excluding multi and dual regions)
    }
  // These emissions factors don't take into account Google's CFE%, and just use the Grid emissions factors published by Google.
  return {
    [GCP_REGIONS.US_CENTRAL1]: 0.000456,
    [GCP_REGIONS.US_CENTRAL2]: 0.000456,
    [GCP_REGIONS.US_EAST1]: 0.000434,
    [GCP_REGIONS.US_EAST4]: 0.000309,
    [GCP_REGIONS.US_EAST5]: 0.000309,
    [GCP_REGIONS.US_WEST1]: 0.00006,
    [GCP_REGIONS.US_WEST2]: 0.00019,
    [GCP_REGIONS.US_WEST3]: 0.000448,
    [GCP_REGIONS.US_WEST4]: 0.000365,
    [GCP_REGIONS.US_SOUTH1]: 0.000296,
    [GCP_REGIONS.ASIA_EAST1]: 0.000456,
    [GCP_REGIONS.ASIA_EAST2]: 0.00036,
    [GCP_REGIONS.ASIA_NORTHEAST1]: 0.000464,
    [GCP_REGIONS.ASIA_NORTHEAST2]: 0.000384,
    [GCP_REGIONS.ASIA_NORTHEAST3]: 0.000425,
    [GCP_REGIONS.ASIA_SOUTH1]: 0.00067,
    [GCP_REGIONS.ASIA_SOUTH2]: 0.000671,
    [GCP_REGIONS.ASIA_SOUTHEAST1]: 0.000372,
    [GCP_REGIONS.ASIA_SOUTHEAST2]: 0.00058,
    [GCP_REGIONS.AUSTRALIA_SOUTHEAST1]: 0.000598,
    [GCP_REGIONS.AUSTRALIA_SOUTHEAST2]: 0.000521,
    [GCP_REGIONS.EUROPE_CENTRAL2]: 0.000576,
    [GCP_REGIONS.EUROPE_NORTH1]: 0.000127,
    [GCP_REGIONS.EUROPE_SOUTHWEST1]: 0.000121,
    [GCP_REGIONS.EUROPE_WEST1]: 0.00011,
    [GCP_REGIONS.EUROPE_WEST2]: 0.000172,
    [GCP_REGIONS.EUROPE_WEST3]: 0.000269,
    [GCP_REGIONS.EUROPE_WEST4]: 0.000283,
    [GCP_REGIONS.EUROPE_WEST6]: 0.000086,
    [GCP_REGIONS.EUROPE_WEST8]: 0.000298,
    [GCP_REGIONS.EUROPE_WEST9]: 0.000059,
    [GCP_REGIONS.NORTHAMERICA_NORTHEAST1]: 0.000028,
    [GCP_REGIONS.NORTHAMERICA_NORTHEAST2]: 0.000029,
    [GCP_REGIONS.SOUTHAMERICA_EAST1]: 0.000129,
    [GCP_REGIONS.SOUTHAMERICA_WEST1]: 0.00019,
    [GCP_DUAL_REGIONS.ASIA1]: 0.000848, // Sum of asia-northeast1 + asia-northeast2
    [GCP_DUAL_REGIONS.EUR4]: 0.00041, // Sum of europe-west4 + europe-north1
    [GCP_DUAL_REGIONS.NAM4]: 0.000828, // Sum of us-central1 + us-east1
    [GCP_MULTI_REGIONS.ASIA]: 0.001676, // Sum of region group data centers within Asia
    [GCP_MULTI_REGIONS.EU]: 0.001843, // Sum of region group data centers within EU
    [GCP_MULTI_REGIONS.US]: 0.002805, // Sum of all US data centers
    [GCP_REGIONS.UNKNOWN]: 0.0003171470588, // Average of the above regions (excludes multi/dual-regions)
  }
}
