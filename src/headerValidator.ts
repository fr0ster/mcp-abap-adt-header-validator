/**
 * Header validator for MCP ABAP ADT authentication headers
 * 
 * Validates and prioritizes authentication headers according to:
 * 1. Destination-based auth (x-mcp-destination) - highest priority
 * 2. Direct JWT token (x-sap-jwt-token) - medium priority
 * 3. Basic auth (x-sap-login + x-sap-password) - lowest priority
 */

import { IncomingHttpHeaders } from 'http';
import { AuthType, AuthMethodPriority, ValidatedAuthConfig, HeaderValidationResult } from './types';

/**
 * Extract header value (handles array values)
 */
function getHeaderValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
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
  const destinationRaw = headers['x-sap-destination'];
  if (!destinationRaw) {
    return null;
  }
  
  const destination = getHeaderValue(headers, 'x-sap-destination');
  
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate destination name (check if empty after trim)
  if (!destination || destination.length === 0) {
    errors.push('x-sap-destination header is empty');
    return {
      priority: AuthMethodPriority.NONE,
      authType: 'jwt', // SAP destination always uses JWT
      sapUrl: '', // URL will be loaded from destination
      errors,
      warnings,
    };
  }

  // Extract optional SAP client
  const sapClient = getHeaderValue(headers, 'x-sap-client');

  // Optional: x-sap-login and x-sap-password (for cloud systems)
  const username = getHeaderValue(headers, 'x-sap-login');
  const password = getHeaderValue(headers, 'x-sap-password');

  // Warning if x-sap-url is provided (URL comes from destination, not header)
  const sapUrl = getHeaderValue(headers, 'x-sap-url');
  if (sapUrl) {
    warnings.push('x-sap-url is ignored when x-sap-destination is present (URL is loaded from destination service key or .env file)');
  }

  // Warning if direct JWT token is also provided (destination takes priority)
  const jwtToken = getHeaderValue(headers, 'x-sap-jwt-token');
  if (jwtToken) {
    warnings.push('x-sap-jwt-token is ignored when x-sap-destination is present (destination-based auth takes priority)');
  }

  // Warning if auth-type is provided (not needed for x-sap-destination)
  const authType = getHeaderValue(headers, 'x-sap-auth-type');
  if (authType) {
    warnings.push('x-sap-auth-type is ignored when x-sap-destination is present (always uses JWT)');
  }

  return {
    priority: AuthMethodPriority.SAP_DESTINATION,
    authType: 'jwt', // Always JWT for x-sap-destination
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
 */
function validateMcpDestinationAuth(
  headers: IncomingHttpHeaders,
  sapUrl: string
): ValidatedAuthConfig | null {
  const destinationRaw = headers['x-mcp-destination'];
  if (!destinationRaw) {
    return null;
  }
  
  const destination = getHeaderValue(headers, 'x-mcp-destination');

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate destination name (check if empty after trim)
  if (!destination || destination.length === 0) {
    errors.push('x-mcp-destination header is empty');
    return {
      priority: AuthMethodPriority.NONE,
      authType: 'jwt', // MCP destination always uses JWT
      sapUrl,
      errors,
      warnings,
    };
  }

  // Warning if x-sap-auth-type is provided (not needed for x-mcp-destination)
  const authType = getHeaderValue(headers, 'x-sap-auth-type');
  if (authType) {
    warnings.push('x-sap-auth-type is ignored when x-mcp-destination is present (always uses JWT)');
  }

  // Extract optional SAP client
  const sapClient = getHeaderValue(headers, 'x-sap-client');

  // Warning if direct JWT token is also provided (destination takes priority)
  const jwtToken = getHeaderValue(headers, 'x-sap-jwt-token');
  if (jwtToken) {
    warnings.push('x-sap-jwt-token is ignored when x-mcp-destination is present (destination-based auth takes priority)');
  }

  return {
    priority: AuthMethodPriority.MCP_DESTINATION,
    authType: 'jwt', // Always JWT for x-mcp-destination
    sapUrl,
    sapClient,
    destination,
    errors,
    warnings,
  };
}

/**
 * Validate direct JWT authentication (medium priority)
 */
function validateDirectJwtAuth(
  headers: IncomingHttpHeaders,
  sapUrl: string,
  authType: AuthType
): ValidatedAuthConfig | null {
  if (authType !== 'jwt' && authType !== 'xsuaa') {
    return null;
  }

  const jwtToken = getHeaderValue(headers, 'x-sap-jwt-token');
  
  if (!jwtToken) {
    return null;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate JWT token format (basic check - should start with eyJ)
  if (jwtToken.length < 10) {
    errors.push('x-sap-jwt-token appears to be invalid (too short)');
  }

  // Extract optional tokens and UAA config
  const refreshToken = getHeaderValue(headers, 'x-sap-refresh-token');
  const uaaUrl = getHeaderValue(headers, 'x-sap-uaa-url') || getHeaderValue(headers, 'uaa-url');
  const uaaClientId = getHeaderValue(headers, 'x-sap-uaa-client-id') || getHeaderValue(headers, 'uaa-client-id');
  const uaaClientSecret = getHeaderValue(headers, 'x-sap-uaa-client-secret') || getHeaderValue(headers, 'uaa-client-secret');
  
  // Extract optional SAP client
  const sapClient = getHeaderValue(headers, 'x-sap-client');
  
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
  if (authType !== 'basic') {
    return null;
  }

  const usernameRaw = headers['x-sap-login'];
  const passwordRaw = headers['x-sap-password'];
  
  if (!usernameRaw || !passwordRaw) {
    return null;
  }

  const username = getHeaderValue(headers, 'x-sap-login');
  const password = getHeaderValue(headers, 'x-sap-password');

  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate username and password (check if empty after trim)
  if (!username || username.length === 0) {
    errors.push('x-sap-login header is empty');
  }

  if (!password || password.length === 0) {
    errors.push('x-sap-password header is empty');
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
  // No headers provided
  if (!headers) {
    return {
      isValid: false,
      errors: ['No headers provided'],
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

  // For other auth methods, x-sap-url is required
  const sapUrl = getHeaderValue(headers, 'x-sap-url');

  // Validate required headers
  if (!sapUrl) {
    errors.push('x-sap-url header is required when x-sap-destination is not present');
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  // Validate URL format
  if (!isValidUrl(sapUrl)) {
    errors.push(`x-sap-url is not a valid URL: ${sapUrl}`);
    return {
      isValid: false,
      errors,
      warnings,
    };
  }

  // Try to validate authentication methods in priority order
  const configs: ValidatedAuthConfig[] = [];

  // 2. MCP destination-based auth (medium-high priority) - doesn't require x-sap-auth-type
  const mcpDestinationConfig = validateMcpDestinationAuth(headers, sapUrl);
  if (mcpDestinationConfig) {
    configs.push(mcpDestinationConfig);
  }

  // 3. Other auth methods require x-sap-auth-type
  const sapAuthType = getHeaderValue(headers, 'x-sap-auth-type');
  if (sapAuthType) {
    // Validate auth type
    const validAuthTypes: AuthType[] = ['jwt', 'xsuaa', 'basic'];
    const authType = sapAuthType.toLowerCase() as AuthType;
    
    if (!validAuthTypes.includes(authType)) {
      errors.push(`x-sap-auth-type must be one of: ${validAuthTypes.join(', ')}, got: ${sapAuthType}`);
    } else {
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
    // No auth-type provided - check if we have MCP destination or need to error
    if (!mcpDestinationConfig && !sapDestinationConfig) {
      errors.push('x-sap-auth-type header is required when x-sap-destination and x-mcp-destination are not present');
    }
  }

  // No valid authentication method found
  if (configs.length === 0) {
    if (sapAuthType) {
      const authType = sapAuthType.toLowerCase() as AuthType;
      if (authType === 'jwt' || authType === 'xsuaa') {
        errors.push('JWT authentication requires either x-sap-destination, x-mcp-destination, or x-sap-jwt-token header');
      } else if (authType === 'basic') {
        errors.push('Basic authentication requires x-sap-login and x-sap-password headers');
      }
    } else if (mcpDestinationConfig && mcpDestinationConfig.errors.length > 0) {
      // MCP destination was found but has errors
      errors.push(...mcpDestinationConfig.errors);
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

