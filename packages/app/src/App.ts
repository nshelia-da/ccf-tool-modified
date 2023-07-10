/*
 * © 2021 Thoughtworks, Inc.
 */

import { promises as fs } from 'fs'
import {
  configLoader,
  EmissionRatioResult,
  EstimationResult,
  GroupBy,
  Logger,
  LookupTableInput,
  LookupTableOutput,
  OnPremiseDataInput,
  OnPremiseDataOutput,
  RecommendationResult,
  reduceByTimestamp,
} from '@cloud-carbon-footprint/common'
import {
  AZURE_CLOUD_CONSTANTS,
  AZURE_EMISSIONS_FACTORS_METRIC_TON_PER_KWH,
  AzureAccount,
} from '@cloud-carbon-footprint/azure'
import {
  AWS_CLOUD_CONSTANTS,
  AWS_EMISSIONS_FACTORS_METRIC_TON_PER_KWH,
  AWSAccount,
} from '@cloud-carbon-footprint/aws'
import { GCPAccount, getGCPEmissionsFactors } from '@cloud-carbon-footprint/gcp'
import { OnPremise } from '@cloud-carbon-footprint/on-premise'

import cache from './Cache'
import { EstimationRequest, RecommendationRequest } from './CreateValidRequest'
import {
  IMapper,
  AccountType,
  CloudProviderAccount,
} from '@cloud-carbon-footprint/core'

import { includeCloudProviders } from './common/helpers'
import {
  IMapper,
  AccountType,
  CloudProviderAccount,
} from '@cloud-carbon-footprint/core'


export const recommendationsMockPath = 'recommendations.mock.json'

export default class App {
  @cache()
  async getCostAndEstimates(
    request: EstimationRequest,
  ): Promise<EstimationResult[]> {
    const appLogger = new Logger('App')
    const { startDate, endDate, cloudProviderToSeed } = request
    const grouping = request.groupBy as GroupBy
    const config = configLoader()
    includeCloudProviders(cloudProviderToSeed, config)
    const { AWS, GCP, AZURE } = config
    if (process.env.TEST_MODE) {
      return []
    }

    const AWSEstimatesByRegion: EstimationResult[][] = []
    if (AWS?.INCLUDE_ESTIMATES) {
      appLogger.info('Starting AWS Estimations')
      if (AWS?.USE_BILLING_DATA) {
        const estimates = await new AWSAccount(
          AWS.BILLING_ACCOUNT_ID,
          AWS.BILLING_ACCOUNT_NAME,
          [AWS.ATHENA_REGION],
        ).getDataFromCostAndUsageReports(startDate, endDate, grouping)
        AWSEstimatesByRegion.push(estimates)
      } else if (AWS?.accounts.length) {
        // Resolve AWS Estimates synchronously in order to avoid hitting API limits
        for (const account of AWS.accounts) {
          const estimates = await Promise.all(
            await new AWSAccount(
              account.id,
              account.name,
              AWS.CURRENT_REGIONS,
            ).getDataForRegions(startDate, endDate, grouping),
          )
          AWSEstimatesByRegion.push(estimates)
        }
      }
      appLogger.info('Finished AWS Estimations')
    }

    const GCPEstimatesByRegion: EstimationResult[][] = []
    if (GCP?.INCLUDE_ESTIMATES) {
      appLogger.info('Starting GCP Estimations')
      if (GCP?.USE_BILLING_DATA) {
        const estimates = await new GCPAccount(
          GCP.BILLING_PROJECT_ID,
          GCP.BILLING_PROJECT_NAME,
          [],
        ).getDataFromBillingExportTable(startDate, endDate, grouping)
        GCPEstimatesByRegion.push(estimates)
      } else if (GCP?.projects.length) {
        // Resolve GCP Estimates asynchronously
        for (const project of GCP.projects) {
          const estimates = await Promise.all(
            await new GCPAccount(
              project.id,
              project.name,
              GCP.CURRENT_REGIONS,
            ).getDataForRegions(startDate, endDate, grouping),
          )
          GCPEstimatesByRegion.push(estimates)
        }
      }
      appLogger.info('Finished GCP Estimations')
    }

    const AzureEstimatesByRegion: EstimationResult[][] = []
    if (AZURE?.INCLUDE_ESTIMATES && AZURE?.USE_BILLING_DATA) {
      appLogger.info('Starting Azure Estimations')
      const azureAccount = new AzureAccount()
      await azureAccount.initializeAccount()
      const estimates = await azureAccount.getDataFromConsumptionManagement(
        startDate,
        endDate,
        grouping,
      )
      AzureEstimatesByRegion.push(estimates)
      appLogger.info('Finished Azure Estimations')
    }

    return reduceByTimestamp(
      AWSEstimatesByRegion.flat()
        .flat()
        .concat(GCPEstimatesByRegion.flat())
        .concat(AzureEstimatesByRegion.flat()),
    )
  }

  getEmissionsFactors(): EmissionRatioResult[] {
    const CLOUD_PROVIDER_EMISSIONS_FACTORS_METRIC_TON_PER_KWH = {
      AWS: AWS_EMISSIONS_FACTORS_METRIC_TON_PER_KWH,
      GCP: getGCPEmissionsFactors(),
      AZURE: AZURE_EMISSIONS_FACTORS_METRIC_TON_PER_KWH,
    }

    return Object.entries(
      CLOUD_PROVIDER_EMISSIONS_FACTORS_METRIC_TON_PER_KWH,
    ).reduce((emissionDataResult, entry) => {
      const [cloudProvider, emissionsFactors] = entry
      Object.keys(emissionsFactors).forEach((region) => {
        emissionDataResult.push({
          cloudProvider,
          region,
          mtPerKwHour: emissionsFactors[region],
        })
      })
      return emissionDataResult
    }, [])
  }

  async getRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResult[]> {
    if (process.env.TEST_MODE) {
      const recommendationsMock = await fs.readFile(
        recommendationsMockPath,
        'utf8',
      )
      return JSON.parse(recommendationsMock)
    }
    const config = configLoader()
    const AWS = config.AWS
    const GCP = config.GCP
    const AZURE = config.AZURE
    const allRecommendations: RecommendationResult[][] = []

    const AWSRecommendations: RecommendationResult[][] = []
    if (AWS.USE_BILLING_DATA) {
      const recommendations = await new AWSAccount(
        AWS.BILLING_ACCOUNT_ID,
        AWS.BILLING_ACCOUNT_NAME,
        [AWS.ATHENA_REGION],
      ).getDataForRecommendations(request.awsRecommendationTarget)
      AWSRecommendations.push(recommendations)
    } else {
      // Resolve AWS Estimates synchronously in order to avoid hitting API limits
      for (const account of AWS.accounts) {
        const recommendations: RecommendationResult[] = await Promise.all(
          await new AWSAccount(
            account.id,
            account.name,
            AWS.CURRENT_REGIONS,
          ).getDataForRecommendations(request.awsRecommendationTarget),
        )
        AWSRecommendations.push(recommendations)
      }
    }
    allRecommendations.push(AWSRecommendations.flat())

    let GCPRecommendations: RecommendationResult[][] = []
    if (GCP.USE_BILLING_DATA) {
      const recommendations = await new GCPAccount(
        GCP.BILLING_PROJECT_ID,
        GCP.BILLING_PROJECT_NAME,
        [],
      ).getDataForRecommendations()
      GCPRecommendations.push(recommendations)
    } else {
      GCPRecommendations = await Promise.all(
        GCP.projects.map((project) =>
          new GCPAccount(
            project.id,
            project.name,
            GCP.CURRENT_REGIONS,
          ).getDataForRecommendations(),
        ),
      )
    }
    allRecommendations.push(GCPRecommendations.flat())

    const AzureRecommendations: RecommendationResult[][] = []
    if (AZURE?.USE_BILLING_DATA) {
      const azureAccount = new AzureAccount()
      await azureAccount.initializeAccount()
      const recommendations = await azureAccount.getDataFromAdvisorManagement()
      AzureRecommendations.push(recommendations)
    }
    allRecommendations.push(AzureRecommendations.flat())

    return allRecommendations.flat()
  }

  getAwsEstimatesFromInputData(
    inputData: LookupTableInput[],
  ): LookupTableOutput[] {
    return AWSAccount.getCostAndUsageReportsDataFromInputData(inputData)
  }

  getGcpEstimatesFromInputData(
    inputData: LookupTableInput[],
  ): LookupTableOutput[] {
    return GCPAccount.getBillingExportDataFromInputData(inputData)
  }

  getAzureEstimatesFromInputData(
    inputData: LookupTableInput[],
  ): LookupTableOutput[] {
    return AzureAccount.getDataFromConsumptionManagementInputData(inputData)
  }

  getOnPremiseEstimatesFromInputData(
    inputData: OnPremiseDataInput[],
  ): OnPremiseDataOutput[] {
    return OnPremise.getOnPremiseDataFromInputData(inputData)
  }

  getAccountByType(accountType: AccountType): CloudProviderAccount {
    const config = configLoader()
    const map: Record<AccountType, CloudProviderAccount> = {
      // temporary use config values, not sure it should be here. Otherwise,
      // getCostAndEstimateSingleRow and accumulateKnownRowData should be a part
      // of some other class
      ['Aws']: new AWSAccount(
        config.AWS.BILLING_ACCOUNT_ID,
        config.AWS.BILLING_ACCOUNT_NAME,
        [config.AWS.ATHENA_REGION],
      ),
      ['Azure']: new AzureAccount(),
    }
    const account = map[accountType]
    if (!account) {
      throw new Error(
        'The ProviderType is not supported: "' + accountType + '"',
      )
    }
    return account
  }

  getAccumulatedSourceByAccountType(accountType: AccountType): any {
    const map: Record<AccountType, any> = {
      ['Aws']: AWS_CLOUD_CONSTANTS,
      ['Azure']: AZURE_CLOUD_CONSTANTS,
    }
    const source = map[accountType]
    if (!source) {
      throw new Error(
        'The ProviderType is not supported: "' + accountType + '"',
      )
    }
    return source
  }

  accumulateKnownRowData(dataMapper: IMapper, accountType: AccountType) {
    const account = this.getAccountByType(accountType)
    account.accumulateKnownRowData(dataMapper)
  }

  getCostAndEstimateSingleRow(
    dataMapper: IMapper,
    accountType: AccountType,
  ): IMapper {
    const account = this.getAccountByType(accountType)
    const accData = this.getAccumulatedData(accountType)
    // hack to prevent modify global data step-1
    const dump = JSON.stringify(accData)
    const result = account.getCostAndEstimateSingleRow(dataMapper)
    this.setAccumulatedData(JSON.parse(dump), accountType)

    return result
  }

  setAccumulatedData(data: Record<string, unknown>, accountType: AccountType) {
    const source = this.getAccumulatedSourceByAccountType(accountType)
    source.KILOWATT_HOURS_BY_SERVICE_AND_USAGE_UNIT = data as never
  }

  getAccumulatedData(accountType: AccountType): Record<string, unknown> {
    const source = this.getAccumulatedSourceByAccountType(accountType)
    return source.KILOWATT_HOURS_BY_SERVICE_AND_USAGE_UNIT
  }
}
