// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getMessageKey } from '../../services/destination'
import * as path from 'path'

const HeadObjectRequest = {}
const PutObjectRequest = {}

jest.mock('dotenv')
jest.mock('@cloud-carbon-footprint/common')
jest.mock('aws-sdk/clients/s3', () => ({
  HeadObjectRequest,
  PutObjectRequest,
}))

jest.mock('../../services/s3', () => ({
  s3: {
    headObject({ Key }: any) {
      return {
        promise: () =>
          Promise.resolve({ Key, LastModified: new Date('2014-02-20') }),
      }
    },
  },
  decodeS3Key: (v: any) => v,
}))

describe('destination', () => {
  it('getMessageKey works', async () => {
    const path1 = await getMessageKey('filename1.csv')
    const path2 = await getMessageKey('filename2.csv.gz')

    expect(path1).toBe(
      path.join('result', 'process_date=2014-02-20', 'filename1.csv.gz'),
    )
    expect(path2).toBe(
      path.join('result', 'process_date=2014-02-20', 'filename2.csv.gz'),
    )
  })

  it('getMessageKey works with path', async () => {
    const path1 = await getMessageKey('path1/path2/test_file.csv')
    const path2 = await getMessageKey('path1/path2/test_file.csv.gz')

    expect(path1).toBe(
      path.join(
        'result',
        'process_date=2014-02-20',
        'path1',
        'path2',
        'test_file.csv.gz',
      ),
    )
    expect(path2).toBe(
      path.join(
        'result',
        'process_date=2014-02-20',
        'path1',
        'path2',
        'test_file.csv.gz',
      ),
    )
  })

  it('getMessageKey works with params in path', async () => {
    const path1 = await getMessageKey('par1=aaa/par2=111/112233/test_file.csv')
    expect(path1).toBe(
      path.join(
        'result',
        'process_date=2014-02-20',
        'par1=aaa',
        'par2=111',
        '112233',
        'test_file.csv.gz',
      ),
    )
  })
})
