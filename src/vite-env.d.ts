/// <reference types="vite/client" />

declare module 'auto.config' {
  import type { EndpointConfig } from './types/operation'

  export const AUTO_CONFIG: {
    basePath?: string
    swaggerUrl?: string
  }

  export const ENDPOINT_CONFIG: EndpointConfig[]
}
