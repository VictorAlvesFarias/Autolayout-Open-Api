export type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey'

export interface AuthState {
  type: AuthType
  bearerToken: string
  basicUsername: string
  basicPassword: string
  apiKeyName: string
  apiKeyValue: string
  apiKeyIn: 'header' | 'query'
}

export const defaultAuthState: AuthState = {
  type: 'none',
  bearerToken: '',
  basicUsername: '',
  basicPassword: '',
  apiKeyName: '',
  apiKeyValue: '',
  apiKeyIn: 'header',
}
