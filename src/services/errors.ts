export type ServiceErrorCode = 'network' | 'storage' | 'not_found' | 'unauthenticated' | 'forbidden' | 'invalid'

export class ServiceError extends Error {
  code: ServiceErrorCode

  constructor(code: ServiceErrorCode, message: string) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
  }
}
