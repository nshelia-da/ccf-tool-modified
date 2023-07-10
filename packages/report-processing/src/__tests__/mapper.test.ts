import { IMapperFactory } from '@cloud-carbon-footprint/core'
import { createMapperFactory } from '../mapper'

const csvHeaders =
  'identity/LineItemId,identity/TimeInterval,bill/InvoiceId,bill/InvoicingEntity,bill/BillingEntity,bill/BillType,bill/PayerAccountId,bill/BillingPeriodStartDate,bill/BillingPeriodEndDate,lineItem/UsageAccountId,lineItem/LineItemType,lineItem/UsageStartDate,lineItem/UsageEndDate,lineItem/ProductCode,lineItem/UsageType,lineItem/Operation,lineItem/AvailabilityZone,lineItem/ResourceId,lineItem/UsageAmount,lineItem/NormalizationFactor,lineItem/NormalizedUsageAmount,lineItem/CurrencyCode,lineItem/UnblendedRate,lineItem/UnblendedCost,lineItem/BlendedRate,lineItem/BlendedCost,lineItem/LineItemDescription,lineItem/TaxType,lineItem/LegalEntity,product/ProductName,product/availability,product/availabilityZone,product/capacitystatus,product/classicnetworkingsupport,product/clockSpeed,product/currentGeneration,product/describes,product/description,product/durability,product/ecu,product/enhancedNetworkingSupported,product/freeQueryTypes,product/fromLocation,product/fromLocationType,product/fromRegionCode,product/gets,product/group,product/groupDescription,product/instanceFamily,product/instanceType,product/instanceTypeFamily,product/intelAvx2Available,product/intelAvxAvailable,product/intelTurboAvailable,product/licenseModel,product/location,product/locationType,product/logsDestination,product/marketoption,product/maxIopsBurstPerformance,product/maxIopsvolume,product/maxThroughputvolume,product/maxVolumeSize,product/memory,product/messageDeliveryFrequency,product/messageDeliveryOrder,product/networkPerformance,product/normalizationSizeFactor,product/operatingSystem,product/operation,product/opsItems,product/physicalProcessor,product/platousagetype,product/preInstalledSw,product/processorArchitecture,product/processorFeatures,product/productFamily,product/queueType,product/region,product/regionCode,product/servicecode,product/servicename,product/sku,product/storage,product/storageClass,product/storageMedia,product/tenancy,product/toLocation,product/toLocationType,product/toRegionCode,product/transferType,product/updates,product/usagetype,product/vcpu,product/version,product/volumeApiName,product/volumeType,product/vpcnetworkingsupport,product/withActiveUsers,pricing/RateCode,pricing/RateId,pricing/currency,pricing/publicOnDemandCost,pricing/publicOnDemandRate,pricing/term,pricing/unit,reservation/AmortizedUpfrontCostForUsage,reservation/AmortizedUpfrontFeeForBillingPeriod,reservation/EffectiveCost,reservation/EndTime,reservation/ModificationStatus,reservation/NormalizedUnitsPerReservation,reservation/NumberOfReservations,reservation/RecurringFeeForUsage,reservation/StartTime,reservation/SubscriptionId,reservation/TotalReservedNormalizedUnits,reservation/TotalReservedUnits,reservation/UnitsPerReservation,reservation/UnusedAmortizedUpfrontFeeForBillingPeriod,reservation/UnusedNormalizedUnitQuantity,reservation/UnusedQuantity,reservation/UnusedRecurringFee,reservation/UpfrontValue,savingsPlan/TotalCommitmentToDate,savingsPlan/SavingsPlanARN,savingsPlan/SavingsPlanRate,savingsPlan/UsedCommitment,savingsPlan/SavingsPlanEffectiveCost,savingsPlan/AmortizedUpfrontCommitmentForBillingPeriod,savingsPlan/RecurringCommitmentForBillingPeriod'
const parquetHeaders =
  'identity_line_item_id,identity_time_interval,bill_invoice_id,bill_invoicing_entity,bill_billing_entity,bill_bill_type,bill_payer_account_id,bill_billing_period_start_date,bill_billing_period_end_date,line_item_usage_account_id,line_item_line_item_type,line_item_usage_start_date,line_item_usage_end_date,line_item_product_code,line_item_usage_type,line_item_operation,line_item_availability_zone,line_item_resource_id,line_item_usage_amount,line_item_normalization_factor,line_item_normalized_usage_amount,line_item_currency_code,line_item_unblended_rate,line_item_unblended_cost,line_item_blended_rate,line_item_blended_cost,line_item_line_item_description,line_item_tax_type,line_item_legal_entity,product_product_name,product_availability,product_availability_zone,product_capacitystatus,product_classicnetworkingsupport,product_clock_speed,product_current_generation,product_description,product_durability,product_ecu,product_enhanced_networking_supported,product_free_query_types,product_from_location,product_from_location_type,product_from_region_code,product_group,product_group_description,product_instance_family,product_instance_type,product_instance_type_family,product_intel_avx2_available,product_intel_avx_available,product_intel_turbo_available,product_license_model,product_location,product_location_type,product_logs_destination,product_marketoption,product_max_iops_burst_performance,product_max_iopsvolume,product_max_throughputvolume,product_max_volume_size,product_memory,product_network_performance,product_normalization_size_factor,product_operating_system,product_operation,product_physical_processor,product_platousagetype,product_pre_installed_sw,product_processor_architecture,product_processor_features,product_product_family,product_region,product_region_code,product_servicecode,product_servicename,product_sku,product_storage,product_storage_class,product_storage_media,product_tenancy,product_to_location,product_to_location_type,product_to_region_code,product_transfer_type,product_usagetype,product_vcpu,product_version,product_volume_api_name,product_volume_type,product_vpcnetworkingsupport,pricing_rate_code,pricing_rate_id,pricing_currency,pricing_public_on_demand_cost,pricing_public_on_demand_rate,pricing_term,pricing_unit,reservation_amortized_upfront_cost_for_usage,reservation_amortized_upfront_fee_for_billing_period,reservation_effective_cost,reservation_end_time,reservation_modification_status,reservation_normalized_units_per_reservation,reservation_number_of_reservations,reservation_recurring_fee_for_usage,reservation_start_time,reservation_subscription_id,reservation_total_reserved_normalized_units,reservation_total_reserved_units,reservation_units_per_reservation,reservation_unused_amortized_upfront_fee_for_billing_period,reservation_unused_normalized_unit_quantity,reservation_unused_quantity,reservation_unused_recurring_fee,reservation_upfront_value,savings_plan_total_commitment_to_date,savings_plan_savings_plan_a_r_n,savings_plan_savings_plan_rate,savings_plan_used_commitment,savings_plan_savings_plan_effective_cost,savings_plan_amortized_upfront_commitment_for_billing_period,savings_plan_recurring_commitment_for_billing_period'
const dataRow =
  'cxf2q3pdu637jelzwkma3eyzo3xke2nji4cxvhalsekp4es2wbna,2022-10-25T11:52:54Z/2022-11-01T00:00:00Z,EUINUA22-574609,AWS EMEA SARL,AWS,Anniversary,912480050416,2022-10-01,2022-11-01,912480050416,Tax,2022-11-12 10:00:00,2022-11-08 12:00:00,AWSCodeCommit,,,,,1.0,0.0,0.0,USD,,0.0,,0.0,Tax for product code AWSCodeCommit,VAT,AWS EMEA SARL,AWS CodeCommit,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,0.0,,,,0.0,0.0,0.0,,,,,0.0,,,,,,0.0,0.0,0.0,0.0,0.0,0.0,,0.0,0.0,0.0,0.0,0.0'
describe('Mapper', () => {
  let withCsvMap: IMapperFactory
  let withParquetMap: IMapperFactory
  beforeEach(() => {
    withCsvMap = createMapperFactory(csvHeaders.split(','))
    withParquetMap = createMapperFactory(parquetHeaders.split(','))
  })
  it('creates with csvMap', async () => {
    const data = withCsvMap.create(dataRow.split(','))
    expect(data.get('timestamp')).toMatchInlineSnapshot(`"2022-11-12 10:00:00"`)
    expect(data.get('accountId')).toMatchInlineSnapshot(`undefined`)
    expect(data.get('accountName')).toMatchInlineSnapshot(`"AWSCodeCommit"`)
    expect(data.get('region')).toMatchInlineSnapshot(`""`)
    expect(data.get('serviceName')).toMatchInlineSnapshot(`"0.0"`)
    expect(data.get('usageType')).toMatchInlineSnapshot(`""`)
    expect(data.get('usageUnit')).toMatchInlineSnapshot(`"1.0"`)
    expect(data.get('vCpus')).toMatchInlineSnapshot(`"0.0"`)
  })
  it('creates with parquetMap', async () => {
    const data = withParquetMap.create(dataRow.split(','))
    expect(data.get('timestamp')).toMatchInlineSnapshot(`"2022-11-12 10:00:00"`)
    expect(data.get('accountId')).toMatchInlineSnapshot(`""`)
    expect(data.get('accountName')).toMatchInlineSnapshot(`"AWSCodeCommit"`)
    expect(data.get('region')).toMatchInlineSnapshot(`""`)
    expect(data.get('serviceName')).toMatchInlineSnapshot(`""`)
    expect(data.get('usageType')).toMatchInlineSnapshot(`""`)
    expect(data.get('usageUnit')).toMatchInlineSnapshot(`"1.0"`)
    expect(data.get('vCpus')).toMatchInlineSnapshot(`"0.0"`)
  })
  it('creates with empty map', async () => {
    const factory = createMapperFactory('region,usageType,other'.split(','))
    const data = factory.create('aaa,bbb,ccc'.split(','))
    expect(data.get('region')).toBe('aaa')
    expect(data.get('usageType')).toBe('bbb')
    expect(data.get('other')).toBe('ccc')
  })
  it('return data without mapping', async () => {
    const dataC = withCsvMap.create(dataRow.split(','))
    const dataP = withParquetMap.create(dataRow.split(','))
    expect(dataC.get('identity/LineItemId')).toBe(
      'cxf2q3pdu637jelzwkma3eyzo3xke2nji4cxvhalsekp4es2wbna',
    )
    expect(dataP.get('identity_line_item_id')).toBe(
      'cxf2q3pdu637jelzwkma3eyzo3xke2nji4cxvhalsekp4es2wbna',
    )
    expect(dataC.get('identity_line_item_id')).toBeUndefined()
    expect(dataP.get('identity/LineItemId')).toBeUndefined()
  })

  it('updates data', async () => {
    const factory = createMapperFactory('region,usageType,other'.split(','))
    const data = factory.create('aaa,bbb,ccc'.split(','))
    expect(data.get('other')).toBe('ccc')
    data.set('other', 'ddd')
    expect(data.get('other')).toBe('ddd')
  })
  it('does not updates data without headers', async () => {
    const factory = createMapperFactory('region,usageType,other'.split(','))
    const data = factory.create('aaa,bbb,ccc'.split(','))
    expect(data.get('wrong_key')).toBeUndefined()
    data.set('wrong_key', 'ddd')
    expect(data.get('wrong_key')).toBeUndefined()
  })
  it('dump data correct', async () => {
    expect(withCsvMap.getHeaderLine()).toMatchSnapshot()
    expect(withParquetMap.getHeaderLine()).toMatchSnapshot()
    const factory = createMapperFactory(['region', 'usageType', 'other'])
    const data = factory.create(['aaa', 'bbb', 'ccc'])
    expect(data.getLine()).toMatchInlineSnapshot(`
      Array [
        "aaa",
        "bbb",
        "ccc",
      ]
    `)
  })
})
