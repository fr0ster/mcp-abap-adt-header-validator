/**
 * Header validator for MCP ABAP ADT
 * 
 * Validates and prioritizes authentication headers for MCP ABAP ADT servers
 */

export { 
  validateAuthHeaders,
  validateProxyHeaders,
  isProxyRequest,
  isMcpServerRequest,
  type ProxyHeaderValidationResult,
} from './headerValidator';
export * from './types';

