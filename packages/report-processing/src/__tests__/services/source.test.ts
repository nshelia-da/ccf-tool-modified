// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getInputSerialization } from '../../services/source'

describe('report-processing', () => {
  it('getInputSerialization error throwing', async () => {
    let error = null
    try {
      getInputSerialization('test.txt')
    } catch (err) {
      error = err
    }
    expect(error).toBeDefined()
    expect(error?.message).toMatchInlineSnapshot(
      `"Cant find proper config for key: test.txt"`,
    )
  })

  it('getInputSerialization error', async () => {
    let csv
    let csvComp
    let parquet
    let error

    try {
      csv = getInputSerialization('test.csv')
      csvComp = getInputSerialization('test.csv.gz')
      parquet = getInputSerialization('test.parquet')
    } catch (err) {
      error = err
    }

    expect(error).toBeUndefined()

    expect(csv).toBeDefined()
    expect(csvComp).toBeDefined()
    expect(parquet).toBeDefined()

    expect(csv.CSV).toBeDefined()
    expect(csv.CompressionType).toBe('NONE')
    expect(csv.Parquet).toBeUndefined()

    expect(csvComp.CSV).toBeDefined()
    expect(csvComp.CompressionType).toBe('GZIP')
    expect(csvComp.Parquet).toBeUndefined()

    expect(parquet).toBeDefined()
    expect(parquet.Parquet).toBeDefined()
    expect(parquet.CSV).toBeUndefined()
    expect(parquet.CompressionType).toBeUndefined()
  })
})
