import { decodeS3Key } from '../../services/s3'
import * as path from 'path'
describe('s3 service testing', () => {
  it('decode file names', async () => {
    expect(decodeS3Key('123/qwe/name.csv.gz')).toBe(
      path.join('123', 'qwe', 'name.csv.gz'),
    )

    expect(decodeS3Key('123/qwe/name%2B+%2B+test.csv.gz')).toBe(
      path.join('123', 'qwe', 'name+ + test.csv.gz'),
    )
    expect(decodeS3Key('123/qwe/name+%2B+test.csv.gz')).toBe(
      path.join('123', 'qwe', 'name + test.csv.gz'),
    )
    expect(decodeS3Key('123/qwe/name+test.csv.gz')).toBe(
      path.join('123', 'qwe', 'name test.csv.gz'),
    )
    expect(decodeS3Key('123/qwe/name%2Btest.csv.gz')).toBe(
      path.join('123', 'qwe', 'name+test.csv.gz'),
    )
  })
})
