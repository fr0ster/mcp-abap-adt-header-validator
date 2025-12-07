/**
 * Header validator for MCP ABAP ADT authentication headers
 * 
 * Provides validation functions for different contexts:
 * - MCP server headers: x-sap-destination, x-mcp-destination, x-sap-url, x-sap-jwt-token, etc.
 * - Proxy headers: x-btp-destination, x-mcp-destination, x-mcp-url
 * 
 * MCP authentication headers are validated and prioritized according to:
 * 1. Destination-based auth (x-sap-destination, x-mcp-destination) - highest priority
 * 2. Direct JWT token (x-sap-jwt-token) - medium priority
 * 3. Basic auth (x-sap-login + x-sap-password) - lowest priority
 */

import { IncomingHttpHeaders } from 'http';
import type { AuthType } from '@mcp-abap-adt/interfaces';
import {
  AuthMethodPriority,
  type IValidatedAuthConfig,
  type IHeaderValidationResult,
  HEADER_SAP_DESTINATION_SERVICE,
  HEADER_MCP_DESTINATION,
  HEADER_BTP_DESTINATION,
  HEADER_MCP_URL,
  HEADER_SAP_CLIENT,
  HEADER_SAP_LOGIN,
  HEADER_SAP_PASSWORD,
  HEADER_SAP_URL,
  HEADER_SAP_JWT_TOKEN,
  HEADER_SAP_AUTH_TYPE,
  HEADER_SAP_REFRESH_TOKEN,
  HEADER_SAP_UAA_URL,
  HEADER_UAA_URL,
  HEADER_SAP_UAA_CLIENT_ID,
  HEADER_UAA_CLIENT_ID,
  HEADER_SAP_UAA_CLIENT_SECRET,
  HEADER_UAA_CLIENT_SECRET,
  AUTH_TYPE_JWT,
  AUTH_TYPE_BASIC,
  AUTH_TYPE_XSUAA,
} from '@mcp-abap-adt/interfaces';

// Re-export for backward compatibility
import type { ValidatedAuthConfig, HeaderValidationResult } from './types';

/**
 * Extract header value (handles array values)
 * Node.js normalizes headers to lowercase, but check both cases for safety
 */
function getHeaderValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  // Try lowercase first (Node.js normalizes to lowercase)
  let value = headers[name.toLowerCase()];
  // If not found, try original case (for compatibility)
  if (!value) {
    value = headers[name];
  }
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value[0]?.trim();
  }
  return String(value).trim();
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate SAP destination-based authentication (highest priority)
 * x-sap-destination - uses AuthBroker, JWT only, no auth-type needed
 * URL is taken from destination (service key or .env), not from x-sap-url header
 */
function validateSapDestinationAuth(
  headers: IncomingHttpHeaders
): ValidatedAuthConfig | null {
  // Check both lowercase and original case (Node.js normalizes to lowercase, but check both for safety)
  const destinationRaw = headers[HEADER_SAP_DESTINATION_SERVICE.toLowerCase()] || headers[HEADER_SAP_DESTINATION_SERVICE];
  if (!destinationRaw) {
    return null;
  }
  
  const destination = getHeaderValue(headers, HEADER_SAP_DESTINATION_SERVICE);
  
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate destination name (check if empty after trim)
  if (!destination || destination.length === 0) {
    errors.push(`${HEADER_SAP_DESTINATION_SERVICE} header is empty`);
    return {
      priority: AuthMethodPriority.NONE,
      authType: AUTH_TYPE_JWT, // SAP destination always uses JWT
      sapUrl: '', // URL will be loaded from destination
      errors,
      warnings,
    };
  }

  // Extract optional SAP client
  const sapClient = getHeaderValue(headers, HEADER_SAP_CLIENT);

  // Optional: x-sap-login and x-sap-password (for cloud systems)
  const username = getHeaderValue(headers, HEADER_SAP_LOGIN);
  const password = getHeaderValue(headers, HEADER_SAP_PASSWORD);

  // Warning if x-sap-url is provided (URL comes from destination, not header)
  const sapUrl = getHeaderValue(headers, HEADER_SAP_URL);
  if (sapUrl) {
    warnings.push(`${HEADER_SAP_URL} is ignored when ${HEADER_SAP_DESTINATION_SERVICE} is present (URL is loaded from destination service key or .env file)`);
  }

  // Warning if direct JWT token is also provided (destination takes priority)
  const jwtToken = getHeaderValue(headers, HEADER_SAP_JWT_TOKEN);
  if (jwtToken) {
    warnings.push(`${HEADER_SAP_JWT_TOKEN} is ignored when ${HEADER_SAP_DESTINATION_SERVICE} is present (destination-based auth takes priority)`);
  }

  // Warning if auth-type is provided (not needed for x-sap-destination)
  const authType = getHeaderValue(headers, HEADER_SAP_AUTH_TYPE);
  if (authType) {
    warnings.push(`${HEADER_SAP_AUTH_TYPE} is ignored when ${HEADER_SAP_DESTINATION_SERVICE} is present (always uses JWT)`);
  }

  return {
    priority: AuthMethodPriority.SAP_DESTINATION,
    authType: AUTH_TYPE_JWT, // Always JWT for x-sap-destination
    sapUrl: '', // URL will be loaded from destination (service key or .env)
    sapClient,
    destination,
    username,
    password,
    errors,
    warnings,
  };
}

/**
 * Validate MCP destination-based authentication (medium-high priority)
 * x-mcp-destination - uses AuthBroker, always JWT (no x-sap-auth-type needed)
 * URL is taken from destination (service key or .env), not from x-sap-url header
 * x-sap-url is optional - if provided, it will be ignored (warning issued)
 */
function validateMcpDestinationAuth(
  headers: IncomingHttpHeaders,
  sapUrl?: string
): ValidatedAuthConfig | null {
  // Check both lowercase and original case (Node.js normalizes to lowercase, but check both for safety)
  const destinationRaw = headers[HEADER_MCP_DESTINATION.toLowerCase()] || headers[HEADER_MCP_DESTINATION];
  if (!destinationRaw) {
    return null;
  }
  
  const destination = getHeaderValue(headers, HEADER_MCP_DESTINATION);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate destination name (check if empty after trim)
  if (!destination || destination.length === 0) {
    errors.push(`${HEADER_MCP_DESTINATION} header is empty`);
    return {
      priority: AuthMethodPriority.NONE,
      authType: AUTH_TYPE_JWT, // MCP destination always uses JWT
      sapUrl: '', // URL will be loaded from destination
      errors,
      warnings,
    };
  }

  // Warning if x-sap-url is provided (URL comes from destination, not header)
  if (sapUrl) {
    warnings.push(`${HEADER_SAP_URL} is ignored when ${HEADER_MCP_DESTINATION} is present (URL is loaded from destination service key or .env file)`);
  }

  // Warning if x-sap-auth-type is provided (not needed for x-mcp-destination)
  const authType = getHeaderValue(headers, HEADER_SAP_AUTH_TYPE);
  if (authType) {
    warnings.push(`${HEADER_SAP_AUTH_TYPE} is ignored when ${HEADER_MCP_DESTINATION} is present (always uses JWT)`);
  }

  // Extract optional SAP client
  const sapClient = getHeaderValue(headers, HEADER_SAP_CLIENT);

  // Warning if direct JWT token is also provided (destination takes priority)
  const jwtToken = getHeaderValue(headers, HEADER_SAP_JWT_TOKEN);
  if (jwtToken) {
    warnings.push(`${HEADER_SAP_JWT_TOKEN} is ignored when ${HEADER_MCP_DESTINATION} is present (destination-based auth takes priority)`);
  }

  return {
    priority: AuthMethodPriority.MCP_DESTINATION,
    authType: AUTH_TYPE_JWT, // Always JWT for x-mcp-destination
    sapUrl: '', // URL will be loaded from destination (service key or .env)
    sapClient,
    destination,
    errors,
    warnings,
  };
}

/**
 * Validate direct JWT authentication (medium priority)
 * 
 * For authorization, only x-sap-jwt-token is required.
 * UAA headers (x-sap-uaa-url, x-sap-uaa-client-id, x-sap-uaa-client-secret) are optional
 * and only used for token refresh - they are a separate set of headers.
 */
function validateDirectJwtAuth(
  headers: IncomingHttpHeaders,
  sapUrl: string,
  authType: AuthType
): ValidatedAuthConfig | null {
  if (authType !== AUTH_TYPE_JWT && authType !== AUTH_TYPE_XSUAA) {
    return null;
  }

  const jwtToken = getHeaderValue(headers, HEADER_SAP_JWT_TOKEN);
  
  if (!jwtToken) {
    return null;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate JWT token format (basic check - should start with eyJ)
  if (jwtToken.length < 10) {
    errors.push(`${HEADER_SAP_JWT_TOKEN} appears to be invalid (too short)`);
  }

  // Extract optional refresh token
  const refreshToken = getHeaderValue(headers, HEADER_SAP_REFRESH_TOKEN);
  
  // Extract optional UAA config (for token refresh only - separate set of headers)
  // These are optional and don't affect authorization validation
  const uaaUrl = getHeaderValue(headers, HEADER_SAP_UAA_URL) || getHeaderValue(headers, HEADER_UAA_URL);
  const uaaClientId = getHeaderValue(headers, HEADER_SAP_UAA_CLIENT_ID) || getHeaderValue(headers, HEADER_UAA_CLIENT_ID);
  const uaaClientSecret = getHeaderValue(headers, HEADER_SAP_UAA_CLIENT_SECRET) || getHeaderValue(headers, HEADER_UAA_CLIENT_SECRET);
  
  // Validate UAA config completeness if any UAA header is present
  if (uaaUrl || uaaClientId || uaaClientSecret) {
    if (!uaaUrl || !uaaClientId || !uaaClientSecret) {
      warnings.push(`UAA headers (${HEADER_SAP_UAA_URL}, ${HEADER_SAP_UAA_CLIENT_ID}, ${HEADER_SAP_UAA_CLIENT_SECRET}) should be provided together for token refresh`);
    }
  }
  
  // Extract optional SAP client
  const sapClient = getHeaderValue(headers, HEADER_SAP_CLIENT);
  
  return {
    priority: AuthMethodPriority.DIRECT_JWT,
    authType,
    sapUrl,
    sapClient,
    jwtToken,
    refreshToken,
    uaaUrl,
    uaaClientId,
    uaaClientSecret,
    errors,
    warnings,
  };
}

/**
 * Validate basic authentication (lowest priority)
 */
function validateBasicAuth(
  headers: IncomingHttpHeaders,
  sapUrl: string,
  authType: AuthType
): ValidatedAuthConfig | null {
  if (authType !== AUTH_TYPE_BASIC) {
    return null;
  }

  const usernameRaw = headers[HEADER_SAP_LOGIN.toLowerCase()] || headers[HEADER_SAP_LOGIN];
  const passwordRaw = headers[HEADER_SAP_PASSWORD.toLowerCase()] || headers[HEADER_SAP_PASSWORD];
  
  if (!usernameRaw || !passwordRaw) {
    return null;
  }

  const username = getHeaderValue(headers, HEADER_SAP_LOGIN);
  const password = getHeaderValue(headers, HEADER_SAP_PASSWORD);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate username and password (check if empty after trim)
  if (!username || username.length === 0) {
    errors.push(`${HEADER_SAP_LOGIN} header is empty`);
  }

  if (!password || password.length === 0) {
    errors.push(`${HEADER_SAP_PASSWORD} header is empty`);
  }
  
  // Return config with errors if validation failed
  if (errors.length > 0) {
    return {
      priority: AuthMethodPriority.NONE,
      authType,
      sapUrl,
      errors,
      warnings,
    };
  }

  return {
    priority: AuthMethodPriority.BASIC,
    authType,
    sapUrl,
    username,
    password,
    errors,
    warnings,
  };
}

/**
 * Validate and prioritize authentication headers
 * 
 * @param headers HTTP headers
 * @returns Validation result with prioritized authentication configuration
 */
export function validateAuthHeaders(headers?: IncomingHttpHeaders): HeaderValidationResult {
  // No headers provided - this is not an error, user may be using .env file
  if (!headers) {
    return {
      isValid: false,
      errors: [],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for SAP destination first (doesn't require x-sap-url)
  const sapDestinationConfig = validateSapDestinationAuth(headers);
  if (sapDestinationConfig) {
    // SAP destination found - URL comes from destination, not header
    if (sapDestinationConfig.errors.length === 0) {
      return {
        isValid: true,
        config: sapDestinationConfig,
        errors: [],
        warnings: sapDestinationConfig.warnings,
      };
    } else {
      // Has errors, continue to check other methods or return error
      return {
        isValid: false,
        errors: sapDestinationConfig.errors,
        warnings: sapDestinationConfig.warnings,
      };
    }
  }

  // Check for MCP destination (doesn't require x-sap-url, URL comes from destination)
  const sapUrl = getHeaderValue(headers, HEADER_SAP_URL);
  const mcpDestinationConfig = validateMcpDestinationAuth(headers, sapUrl);
  if (mcpDestinationConfig) {
    // MCP destination found - URL comes from destination, not header
    if (mcpDestinationConfig.errors.length === 0) {
      return {
        isValid: true,
        config: mcpDestinationConfig,
        errors: [],
        warnings: mcpDestinationConfig.warnings,
      };
    } else {
      // Has errors, continue to check other methods or return error
      return {
        isValid: false,
        errors: mcpDestinationConfig.errors,
        warnings: mcpDestinationConfig.warnings,
      };
    }
  }

  // For other auth methods, x-sap-url is required
  if (!sapUrl) {
    // If no auth headers at all, return empty result (not an error - may use .env file)
    return {
      isValid: false,
      errors: [],
      warnings: [],
    };
  }

  // Validate URL format
  if (!isValidUrl(sapUrl)) {
    errors.push(`${HEADER_SAP_URL} is not a valid URL: ${sapUrl}`);
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  // Try to validate authentication methods in priority order
  const configs: ValidatedAuthConfig[] = [];

  // Check if basic auth headers are present (x-sap-login, x-sap-password)
  // These should come together with x-sap-auth-type: basic
  const hasSapLogin = !!getHeaderValue(headers, HEADER_SAP_LOGIN);
  const hasSapPassword = !!getHeaderValue(headers, HEADER_SAP_PASSWORD);
  const hasBasicAuthHeaders = hasSapLogin || hasSapPassword;
  
  if (hasBasicAuthHeaders && (!hasSapLogin || !hasSapPassword)) {
    errors.push(`${HEADER_SAP_LOGIN} and ${HEADER_SAP_PASSWORD} must be provided together`);
  }

  // 3. Other auth methods require x-sap-auth-type
  const sapAuthType = getHeaderValue(headers, HEADER_SAP_AUTH_TYPE);
  if (sapAuthType) {
    // Validate auth type
    const validAuthTypes: AuthType[] = [AUTH_TYPE_JWT, AUTH_TYPE_XSUAA, AUTH_TYPE_BASIC];
    const authType = sapAuthType.toLowerCase() as AuthType;
    
    if (!validAuthTypes.includes(authType)) {
      errors.push(`${HEADER_SAP_AUTH_TYPE} must be one of: ${validAuthTypes.join(', ')}, got: ${sapAuthType}`);
    } else {
      // Check if basic auth headers are present but auth-type is not basic
      if (hasBasicAuthHeaders && authType !== AUTH_TYPE_BASIC) {
        warnings.push(`${HEADER_SAP_LOGIN} and ${HEADER_SAP_PASSWORD} are present but ${HEADER_SAP_AUTH_TYPE} is not "${AUTH_TYPE_BASIC}"`);
      }
      
      // Check if auth-type is basic but headers are missing
      if (authType === AUTH_TYPE_BASIC && !hasBasicAuthHeaders) {
        errors.push(`${HEADER_SAP_AUTH_TYPE} is "${AUTH_TYPE_BASIC}" but ${HEADER_SAP_LOGIN} and ${HEADER_SAP_PASSWORD} are missing`);
      }
      
      // Only validate direct JWT and basic auth if MCP destination is not present
      // (MCP destination already handled above)
      if (!mcpDestinationConfig) {
        // 4. Direct JWT auth (medium priority)
        const jwtConfig = validateDirectJwtAuth(headers, sapUrl, authType);
        if (jwtConfig) {
          configs.push(jwtConfig);
        }

        // 5. Basic auth (lowest priority)
        const basicConfig = validateBasicAuth(headers, sapUrl, authType);
        if (basicConfig) {
          configs.push(basicConfig);
        }
      }
    }
  } else {
    // No auth-type provided
    // If basic auth headers are present, auth-type must be basic
    if (hasBasicAuthHeaders) {
      errors.push(`${HEADER_SAP_AUTH_TYPE} must be "${AUTH_TYPE_BASIC}" when ${HEADER_SAP_LOGIN} and ${HEADER_SAP_PASSWORD} are present`);
    } else if (!mcpDestinationConfig && !sapDestinationConfig) {
      // No auth-type and no destination - error
      errors.push(`${HEADER_SAP_AUTH_TYPE} header is required when ${HEADER_SAP_DESTINATION_SERVICE} and ${HEADER_MCP_DESTINATION} are not present`);
    }
  }

  // No valid authentication method found
  if (configs.length === 0) {
    if (sapAuthType) {
      const authType = sapAuthType.toLowerCase() as AuthType;
      if (authType === AUTH_TYPE_JWT || authType === AUTH_TYPE_XSUAA) {
        errors.push(`JWT authentication requires either ${HEADER_SAP_DESTINATION_SERVICE}, ${HEADER_MCP_DESTINATION}, or ${HEADER_SAP_JWT_TOKEN} header`);
      } else if (authType === AUTH_TYPE_BASIC) {
        errors.push(`Basic authentication requires ${HEADER_SAP_LOGIN} and ${HEADER_SAP_PASSWORD} headers`);
      }
    } else {
      // Check if MCP destination was found but has errors
      const mcpConfig = validateMcpDestinationAuth(headers, sapUrl);
      if (mcpConfig && mcpConfig.errors.length > 0) {
        errors.push(...mcpConfig.errors);
      }
    }
    
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  // Select highest priority configuration
  const selectedConfig = configs.reduce((prev, current) => 
    current.priority > prev.priority ? current : prev
  );

  // Check for conflicts (multiple auth methods with same priority shouldn't happen, but check anyway)
  const samePriorityConfigs = configs.filter(c => c.priority === selectedConfig.priority);
  if (samePriorityConfigs.length > 1) {
    warnings.push(`Multiple authentication methods with same priority detected, using: ${AuthMethodPriority[selectedConfig.priority]}`);
  }

  // Merge errors and warnings
  const allErrors = [...errors, ...selectedConfig.errors];
  const allWarnings = [...warnings, ...selectedConfig.warnings];

  return {
    isValid: allErrors.length === 0,
    config: selectedConfig,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Proxy Header Validation
 * 
 * Functions to validate proxy-specific headers (x-btp-destination, x-mcp-destination, x-mcp-url)
 * These are separate from MCP authentication headers and used for proxy routing decisions.
 */

export interface ProxyHeaderValidationResult {
  isValid: boolean;
  hasBtpDestination: boolean;
  hasMcpDestination: boolean;
  hasMcpUrl: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate proxy routing headers
 * 
 * Checks for proxy-specific headers:
 * - x-btp-destination: BTP Cloud authorization destination
 * - x-mcp-destination: SAP ABAP connection destination
 * - x-mcp-url: Direct MCP server URL
 * 
 * @param headers HTTP headers
 * @returns Validation result indicating which proxy headers are present
 */
export function validateProxyHeaders(headers?: IncomingHttpHeaders): ProxyHeaderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!headers) {
    return {
      isValid: false,
      hasBtpDestination: false,
      hasMcpDestination: false,
      hasMcpUrl: false,
      errors: [],
      warnings: [],
    };
  }

  const btpDestination = getHeaderValue(headers, HEADER_BTP_DESTINATION);
  const mcpDestination = getHeaderValue(headers, HEADER_MCP_DESTINATION);
  const mcpUrl = getHeaderValue(headers, HEADER_MCP_URL);

  const hasBtpDestination = !!btpDestination;
  const hasMcpDestination = !!mcpDestination;
  const hasMcpUrl = !!mcpUrl;

  // Validate destination names if present
  if (hasBtpDestination && (!btpDestination || btpDestination.trim().length === 0)) {
    errors.push(`${HEADER_BTP_DESTINATION} header is empty`);
  }

  if (hasMcpDestination && (!mcpDestination || mcpDestination.trim().length === 0)) {
    errors.push(`${HEADER_MCP_DESTINATION} header is empty`);
  }

  // Validate mcpUrl format if present
  if (hasMcpUrl) {
    if (!isValidUrl(mcpUrl!)) {
      errors.push(`${HEADER_MCP_URL} is not a valid URL: ${mcpUrl}`);
    }
  }

  // At least one proxy header should be present for proxy routing
  const hasAnyProxyHeader = hasBtpDestination || hasMcpDestination || hasMcpUrl;
  if (!hasAnyProxyHeader) {
    warnings.push(`No proxy headers found (${HEADER_BTP_DESTINATION}, ${HEADER_MCP_DESTINATION}, or ${HEADER_MCP_URL})`);
  }

  return {
    isValid: errors.length === 0,
    hasBtpDestination,
    hasMcpDestination,
    hasMcpUrl,
    errors,
    warnings,
  };
}

/**
 * Check if headers indicate a proxy request
 * 
 * A request is considered a proxy request if it has at least one of:
 * - x-btp-destination
 * - x-mcp-destination
 * - x-mcp-url
 * 
 * @param headers HTTP headers
 * @returns true if headers indicate a proxy request
 */
export function isProxyRequest(headers?: IncomingHttpHeaders): boolean {
  if (!headers) {
    return false;
  }

  const validation = validateProxyHeaders(headers);
  return validation.hasBtpDestination || validation.hasMcpDestination || validation.hasMcpUrl;
}

/**
 * Check if headers indicate an MCP server request (not proxy)
 * 
 * An MCP server request has MCP authentication headers but no proxy headers:
 * - Has x-sap-destination, x-mcp-destination, x-sap-url, x-sap-jwt-token, etc.
 * - Does NOT have x-btp-destination or x-mcp-url (proxy-specific)
 * 
 * @param headers HTTP headers
 * @returns true if headers indicate an MCP server request
 */
export function isMcpServerRequest(headers?: IncomingHttpHeaders): boolean {
  if (!headers) {
    return false;
  }

  // Check for MCP authentication headers
  const hasSapDestination = !!getHeaderValue(headers, HEADER_SAP_DESTINATION_SERVICE);
  const hasMcpDestination = !!getHeaderValue(headers, HEADER_MCP_DESTINATION);
  const hasSapUrl = !!getHeaderValue(headers, HEADER_SAP_URL);
  const hasSapJwtToken = !!getHeaderValue(headers, HEADER_SAP_JWT_TOKEN);

  // Check for proxy-specific headers
  const hasBtpDestination = !!getHeaderValue(headers, HEADER_BTP_DESTINATION);
  const hasMcpUrl = !!getHeaderValue(headers, HEADER_MCP_URL);

  // MCP server request has MCP auth headers but no proxy headers
  const hasMcpAuthHeaders = hasSapDestination || hasMcpDestination || hasSapUrl || hasSapJwtToken;
  const hasProxyHeaders = hasBtpDestination || hasMcpUrl;

  return hasMcpAuthHeaders && !hasProxyHeaders;
}

