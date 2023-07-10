import { IMapper, IMapperFactory } from '@cloud-carbon-footprint/core'
import moment from 'moment'

interface IMap {
  timestamp: string
  accountId: string
  accountName: string
  region: string
  serviceName: string
  usageType: string
  usageUnit: string
  vCpus: string
}

const parquetMap: IMap = {
  timestamp: 'line_item_usage_start_date',
  accountId: 'product_region',
  accountName: 'line_item_product_code',
  region: 'line_item_usage_type',
  serviceName: 'pricing_unit',
  usageType: 'product_vcpu',
  usageUnit: 'line_item_usage_amount',
  vCpus: 'line_item_blended_cost',
}
const csvMap: IMap = {
  timestamp: 'lineItem/UsageStartDate',
  accountId: 'product/Region',
  accountName: 'lineItem/ProductCode',
  region: 'lineItem/UsageType',
  serviceName: 'pricing/unit',
  usageType: 'product/vcpu',
  usageUnit: 'lineItem/UsageAmount',
  vCpus: 'lineItem/BlendedCost',
}

function getMap(fields: string[]): IMap {
  let set = new Set(Object.values(csvMap))
  if (fields.some((field) => set.has(field))) return csvMap
  set = new Set(Object.values(parquetMap))
  if (fields.some((field) => set.has(field))) return parquetMap
  return {} as any
}

/*
 * Create a data structure to handle read/write access to csv structure for O(1)
 **/
export default class DataMapper implements IMapper {
  constructor(
    private record: unknown[],
    private headers: Record<string, number>,
    private map: IMap,
    private conciseMode?: boolean
  ) {}
  get(field: string): unknown {
    if (field in this.map) {
      field = this.map[field as keyof IMap]
    }
    const i = this.headers[field]
    return this.record[i]
  }
  set(field: string, value: unknown) {
    if (field in this.map) {
      field = this.map[field as keyof IMap]
    }
    if (!(field in this.headers)) return
    const i = this.headers[field]
    this.record[i] = value
  }
  getLine(): string[] {
    const len = Object.keys(this.headers).length
    const values = Object.values(this.headers)
    if (this.conciseMode) {
      while (len > this.record.length) this.record.push(',')

      // Remove 'empty' vals from array
      for (let i = 0; i < this.record.length; i++) {
        if (this.record[i] === undefined) {
          this.record[i] = '';
        }
      }
      // Only get records whose index is in values array
      let filteredRecords = this.record.filter((item: any,index) => values.includes(index))
      return filteredRecords.map((val) =>
      val instanceof Date ? escapeDate(val) : val,
    ) as unknown as string[]
    }
    while (len > this.record.length) this.record.push('')

   return this.record.map((val) =>
      val instanceof Date ? escapeDate(val) : val,
    ) as unknown as string[]

  }
}

function escapeDate(date: Date): string {
  return moment(date).toISOString()
}

// The properties to keep
const propertiesToKeep = [
  "lineItem/ProductCode",
  "lineItem/UsageType",
  "lineItem/UsageAmount",
  "pricing/unit",
  "resourceTags/user:mnd-applicationid",
  "lineItem/UsageStartDate",
  "product/region",
  "lineItem/UsageAccountId",
  "bill/BillingEntity",
  "resourceTags/user:Environment",
  "resourceTags/user:CostCenter",
  'lineItem/BlendedRate',
  'lineItem/BlendedCost',
  'product/ProductName',
  'discount/EdpDiscount',
  'discount/PrivateRateDiscount',
  'discount/TotalDiscount',
  'kilowattHours',
  'co2e',
  'ccf_version'
];


function parseHeaders(headerList: string[] = []) {
  const headers: Record<string, number> = {}
  const headerLine = headerList.filter((item) =>item !== 'None')
  const map = getMap(headerList)
  console.log(JSON.stringify(headerList))
  headerList.forEach((header, i) => {
    // Get indexes for non None proeprties
    if (header !== 'None') {
      headers[header] = i
    }
  })

  return { headers, headerLine, map }
}

export function createMapperFactory(rawHeaders: string[],conciseMode?: boolean): IMapperFactory {
  const filterProperties = (arr: any, properties: any) => {
    // Assign None value for unnecessary props
    return arr.map((item: any) => conciseMode ? properties.includes(item) ? item : 'None' : item);
  };
  const { headers, headerLine, map } = parseHeaders(!conciseMode ? [...rawHeaders] : [...filterProperties(rawHeaders, propertiesToKeep)])
  return {
    create: (record: unknown[]) => new DataMapper(record, headers, map,conciseMode),
    getHeaderLine: () => headerLine,
  }
}
