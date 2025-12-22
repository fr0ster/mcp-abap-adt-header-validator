/**
 * Header validator for MCP ABAP ADT
 *
 * Validates and prioritizes authentication headers for MCP ABAP ADT servers
 */

export {
  isMcpServerRequest,
  isProxyRequest,
  type ProxyHeaderValidationResult,
  validateAuthHeaders,
  validateProxyHeaders,
} from './headerValidator';
export * from './types';
