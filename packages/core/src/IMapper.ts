export default interface IMapper {
  get(field: string): unknown
  set(field: string, value: unknown): void
  getLine(): string[]
}

export interface IMapperFactory {
  create: (record: unknown[]) => IMapper
  getHeaderLine(): string[]
}
