/**
 * Unit tests for header validator
 * Uses mocks for header inputs
 */

import { validateAuthHeaders } from '../headerValidator';
import { AuthMethodPriority } from '../types';
import { IncomingHttpHeaders } from 'http';
import {
  HEADER_SAP_DESTINATION_SERVICE,
  HEADER_MCP_DESTINATION,
  HEADER_SAP_URL,
  HEADER_SAP_AUTH_TYPE,
  HEADER_SAP_JWT_TOKEN,
  HEADER_SAP_CLIENT,
  HEADER_SAP_LOGIN,
  HEADER_SAP_PASSWORD,
  HEADER_SAP_REFRESH_TOKEN,
  HEADER_SAP_UAA_URL,
  HEADER_SAP_UAA_CLIENT_ID,
  HEADER_SAP_UAA_CLIENT_SECRET,
  AUTH_TYPE_JWT,
  AUTH_TYPE_BASIC,
} from '@mcp-abap-adt/interfaces';

describe('validateAuthHeaders', () => {
  describe('Error cases', () => {
    it('should return invalid (not error) when no headers provided - allows .env file usage', () => {
      const result = validateAuthHeaders(undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([]); // Not an error - user may be using .env file
      expect(result.config).toBeUndefined();
    });

    it('should return invalid (not error) when x-sap-auth-type is provided but x-sap-url is missing - allows .env file usage', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      // If no URL provided, it's not an error - user may be using .env file
      // The error will be caught when trying to use the config
      expect(result.errors).toEqual([]);
      expect(result.config).toBeUndefined();
    });

    it('should return error when x-sap-auth-type is missing and no x-sap-destination or x-mcp-destination', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(HEADER_SAP_AUTH_TYPE) && e.includes('required'))).toBe(true);
    });

    it('should return error when x-sap-url is invalid', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'not-a-valid-url',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not a valid URL'))).toBe(true);
    });

    it('should return error when x-sap-auth-type is invalid', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: 'invalid',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(HEADER_SAP_AUTH_TYPE) && e.includes('must be one of'))).toBe(true);
    });

    it('should return error when JWT auth type but no token or destination', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT authentication requires'))).toBe(true);
    });

    it('should return error when basic auth type but no credentials', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_BASIC,
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Basic authentication requires'))).toBe(true);
    });
  });

  describe('SAP destination-based authentication (highest priority)', () => {
    it('should validate x-sap-destination auth (no x-sap-url needed, URL from destination)', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_DESTINATION_SERVICE]: 'S4HANA_E19',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.priority).toBe(AuthMethodPriority.SAP_DESTINATION);
      expect(result.config?.destination).toBe('S4HANA_E19');
      expect(result.config?.authType).toBe('jwt');
      expect(result.config?.sapUrl).toBe(''); // URL loaded from destination
    });

    it('should return warning when x-sap-url is provided with x-sap-destination', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_DESTINATION_SERVICE]: 'S4HANA_E19',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes(HEADER_SAP_URL) && w.includes('ignored'))).toBe(true);
    });

    it('should validate x-sap-destination with optional x-sap-client', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_DESTINATION_SERVICE]: 'S4HANA_E19',
        [HEADER_SAP_CLIENT]: '100',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.sapClient).toBe('100');
    });

    it('should validate x-sap-destination with optional login/password', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_DESTINATION_SERVICE]: 'S4HANA_E19',
        [HEADER_SAP_LOGIN]: 'user',
        [HEADER_SAP_PASSWORD]: 'pass',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.username).toBe('user');
      expect(result.config?.password).toBe('pass');
    });

    it('should return warning when x-sap-destination and x-sap-auth-type both present', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_DESTINATION_SERVICE]: 'S4HANA_E19',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT, // not needed, will be ignored
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes(HEADER_SAP_AUTH_TYPE) && w.includes('ignored'))).toBe(true);
    });

    it('should return error when x-sap-destination is empty', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_DESTINATION_SERVICE]: '   ',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(HEADER_SAP_DESTINATION_SERVICE) && e.includes('empty'))).toBe(true);
    });
  });

  describe('MCP destination-based authentication (medium-high priority)', () => {
    it('should validate x-mcp-destination auth without x-sap-url (URL from destination)', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_MCP_DESTINATION]: 'TRIAL',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.authType).toBe('jwt'); // Always JWT
      expect(result.config?.sapUrl).toBe(''); // URL will be loaded from destination
    });

    it('should validate x-mcp-destination auth and warn when x-sap-url is provided', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_MCP_DESTINATION]: 'TRIAL',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.authType).toBe('jwt'); // Always JWT
      expect(result.config?.sapUrl).toBe(''); // URL from destination, not header
      expect(result.warnings.some(w => w.includes(HEADER_SAP_URL) && w.includes('ignored'))).toBe(true);
    });

    it('should validate x-mcp-destination auth and warn when x-sap-auth-type is provided', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
        [HEADER_MCP_DESTINATION]: 'TRIAL',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.authType).toBe('jwt');
      expect(result.warnings.some(w => w.includes(HEADER_SAP_AUTH_TYPE) && w.includes('ignored'))).toBe(true);
      expect(result.warnings.some(w => w.includes(HEADER_SAP_URL) && w.includes('ignored'))).toBe(true);
    });

    it('should validate x-mcp-destination auth and warn when x-sap-auth-type is xsuaa', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: 'xsuaa', // Using string literal as AUTH_TYPE_XSUAA might not be needed here
        [HEADER_MCP_DESTINATION]: 'PRODUCTION',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('PRODUCTION');
      expect(result.config?.authType).toBe('jwt'); // Always JWT, not xsuaa
      expect(result.warnings.some(w => w.includes(HEADER_SAP_AUTH_TYPE) && w.includes('ignored'))).toBe(true);
      expect(result.warnings.some(w => w.includes(HEADER_SAP_URL) && w.includes('ignored'))).toBe(true);
    });

    it('should return warning when x-mcp-destination and direct JWT token both present', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
        [HEADER_MCP_DESTINATION]: 'TRIAL',
        [HEADER_SAP_JWT_TOKEN]: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.warnings.some(w => w.includes(HEADER_SAP_JWT_TOKEN) && w.includes('ignored'))).toBe(true);
      expect(result.warnings.some(w => w.includes(HEADER_SAP_AUTH_TYPE) && w.includes('ignored'))).toBe(true);
      expect(result.warnings.some(w => w.includes(HEADER_SAP_URL) && w.includes('ignored'))).toBe(true);
    });

    it('should prioritize x-mcp-destination over basic auth', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_BASIC,
        [HEADER_MCP_DESTINATION]: 'TRIAL',
        [HEADER_SAP_LOGIN]: 'user',
        [HEADER_SAP_PASSWORD]: 'pass',
      };
      
      const result = validateAuthHeaders(headers);
      
      // x-mcp-destination should take priority (checked before x-sap-auth-type)
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.authType).toBe('jwt');
      expect(result.warnings.some(w => w.includes(HEADER_SAP_URL) && w.includes('ignored'))).toBe(true);
    });

    it('should return error when x-mcp-destination is empty', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_MCP_DESTINATION]: '   ',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(HEADER_MCP_DESTINATION) && e.includes('empty'))).toBe(true);
    });
  });

  describe('Direct JWT authentication (medium priority)', () => {
    it('should validate direct JWT auth', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
        [HEADER_SAP_JWT_TOKEN]: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.DIRECT_JWT);
      expect(result.config?.jwtToken).toBeDefined();
      expect(result.config?.authType).toBe('jwt');
    });

    it('should validate direct JWT auth with refresh token and UAA config', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
        [HEADER_SAP_JWT_TOKEN]: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        [HEADER_SAP_REFRESH_TOKEN]: 'refresh_token_here',
        [HEADER_SAP_UAA_URL]: 'https://uaa.test.com',
        [HEADER_SAP_UAA_CLIENT_ID]: 'client_id',
        [HEADER_SAP_UAA_CLIENT_SECRET]: 'client_secret',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.DIRECT_JWT);
      expect(result.config?.refreshToken).toBe('refresh_token_here');
      expect(result.config?.uaaUrl).toBe('https://uaa.test.com');
      expect(result.config?.uaaClientId).toBe('client_id');
      expect(result.config?.uaaClientSecret).toBe('client_secret');
    });

    it('should return error when JWT token is too short', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
        [HEADER_SAP_JWT_TOKEN]: 'short',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes(HEADER_SAP_JWT_TOKEN) && e.includes('invalid'))).toBe(true);
    });

    it('should handle array header values', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: ['https://test.sap.com'],
        [HEADER_SAP_AUTH_TYPE]: [AUTH_TYPE_JWT],
        [HEADER_SAP_JWT_TOKEN]: ['eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'],
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.DIRECT_JWT);
    });
  });

  describe('Basic authentication (lowest priority)', () => {
    it('should validate basic auth', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_BASIC,
        [HEADER_SAP_LOGIN]: 'username',
        [HEADER_SAP_PASSWORD]: 'password',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.BASIC);
      expect(result.config?.username).toBe('username');
      expect(result.config?.password).toBe('password');
      expect(result.config?.authType).toBe('basic');
    });

    it('should return error when username is missing', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_BASIC,
        [HEADER_SAP_PASSWORD]: 'password',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Basic authentication requires'))).toBe(true);
    });

    it('should return error when password is missing', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_BASIC,
        [HEADER_SAP_LOGIN]: 'username',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Basic authentication requires'))).toBe(true);
    });

    it('should return error when username is empty', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_BASIC,
        [HEADER_SAP_LOGIN]: '   ',
        [HEADER_SAP_PASSWORD]: 'password',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('x-sap-login header is empty'))).toBe(true);
    });

    it('should return error when password is empty', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_BASIC,
        [HEADER_SAP_LOGIN]: 'username',
        [HEADER_SAP_PASSWORD]: '   ',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('x-sap-password header is empty'))).toBe(true);
    });
  });

  describe('Priority handling', () => {
    it('should prioritize x-sap-destination over x-mcp-destination', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_DESTINATION_SERVICE]: 'S4HANA_E19',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
        [HEADER_MCP_DESTINATION]: 'TRIAL',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.SAP_DESTINATION);
      expect(result.config?.destination).toBe('S4HANA_E19');
    });

    it('should prioritize x-mcp-destination over direct JWT', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
        [HEADER_MCP_DESTINATION]: 'TRIAL',
        [HEADER_SAP_JWT_TOKEN]: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.jwtToken).toBeUndefined();
    });

    it('should prioritize direct JWT over basic when both present (should not happen in practice)', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT, // JWT type, but also basic headers
        [HEADER_SAP_JWT_TOKEN]: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        [HEADER_SAP_LOGIN]: 'user',
        [HEADER_SAP_PASSWORD]: 'pass',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.DIRECT_JWT);
      expect(result.config?.username).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle headers with whitespace', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: '  https://test.sap.com  ',
        [HEADER_SAP_AUTH_TYPE]: '  jwt  ',
        [HEADER_SAP_JWT_TOKEN]: '  eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...  ',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.sapUrl).toBe('https://test.sap.com');
      expect(result.config?.authType).toBe('jwt');
    });

    it('should handle case-insensitive auth type', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'https://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: 'JWT', // uppercase
        [HEADER_SAP_JWT_TOKEN]: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.authType).toBe('jwt');
    });

    it('should handle http URLs', () => {
      const headers: IncomingHttpHeaders = {
        [HEADER_SAP_URL]: 'http://test.sap.com',
        [HEADER_SAP_AUTH_TYPE]: AUTH_TYPE_JWT,
        [HEADER_SAP_JWT_TOKEN]: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.sapUrl).toBe('http://test.sap.com');
    });
  });
});

