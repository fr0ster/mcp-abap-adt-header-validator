/**
 * Unit tests for header validator
 * Uses mocks for header inputs
 */

import { validateAuthHeaders } from '../headerValidator';
import { AuthMethodPriority } from '../types';
import { IncomingHttpHeaders } from 'http';

describe('validateAuthHeaders', () => {
  describe('Error cases', () => {
    it('should return error when no headers provided', () => {
      const result = validateAuthHeaders(undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No headers provided');
      expect(result.config).toBeUndefined();
    });

    it('should return error when x-sap-url is missing and no x-sap-destination', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-auth-type': 'jwt',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('x-sap-url header is required when x-sap-destination is not present');
    });

    it('should return error when x-sap-auth-type is missing and no x-sap-destination or x-mcp-destination', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('x-sap-auth-type header is required when x-sap-destination and x-mcp-destination are not present');
    });

    it('should return error when x-sap-url is invalid', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'not-a-valid-url',
        'x-sap-auth-type': 'jwt',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not a valid URL'))).toBe(true);
    });

    it('should return error when x-sap-auth-type is invalid', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'invalid',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('x-sap-auth-type must be one of'))).toBe(true);
    });

    it('should return error when JWT auth type but no token or destination', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'jwt',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('JWT authentication requires'))).toBe(true);
    });

    it('should return error when basic auth type but no credentials', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'basic',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Basic authentication requires'))).toBe(true);
    });
  });

  describe('SAP destination-based authentication (highest priority)', () => {
    it('should validate x-sap-destination auth (no x-sap-url needed, URL from destination)', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-destination': 'S4HANA_E19',
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
        'x-sap-url': 'https://test.sap.com',
        'x-sap-destination': 'S4HANA_E19',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('x-sap-url is ignored'))).toBe(true);
    });

    it('should validate x-sap-destination with optional x-sap-client', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-destination': 'S4HANA_E19',
        'x-sap-client': '100',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.sapClient).toBe('100');
    });

    it('should validate x-sap-destination with optional login/password', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-destination': 'S4HANA_E19',
        'x-sap-login': 'user',
        'x-sap-password': 'pass',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.username).toBe('user');
      expect(result.config?.password).toBe('pass');
    });

    it('should return warning when x-sap-destination and x-sap-auth-type both present', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-destination': 'S4HANA_E19',
        'x-sap-auth-type': 'jwt', // not needed, will be ignored
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('x-sap-auth-type is ignored'))).toBe(true);
    });

    it('should return error when x-sap-destination is empty', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-destination': '   ',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('x-sap-destination header is empty'))).toBe(true);
    });
  });

  describe('MCP destination-based authentication (medium-high priority)', () => {
    it('should validate x-mcp-destination auth without x-sap-auth-type', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-mcp-destination': 'TRIAL',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.authType).toBe('jwt'); // Always JWT
      expect(result.config?.sapUrl).toBe('https://test.sap.com');
    });

    it('should validate x-mcp-destination auth and warn when x-sap-auth-type is provided', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'jwt',
        'x-mcp-destination': 'TRIAL',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.authType).toBe('jwt');
      expect(result.warnings.some(w => w.includes('x-sap-auth-type is ignored'))).toBe(true);
    });

    it('should validate x-mcp-destination auth and warn when x-sap-auth-type is xsuaa', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'xsuaa',
        'x-mcp-destination': 'PRODUCTION',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('PRODUCTION');
      expect(result.config?.authType).toBe('jwt'); // Always JWT, not xsuaa
      expect(result.warnings.some(w => w.includes('x-sap-auth-type is ignored'))).toBe(true);
    });

    it('should return warning when x-mcp-destination and direct JWT token both present', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'jwt',
        'x-mcp-destination': 'TRIAL',
        'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.warnings.some(w => w.includes('x-sap-jwt-token is ignored'))).toBe(true);
      expect(result.warnings.some(w => w.includes('x-sap-auth-type is ignored'))).toBe(true);
    });

    it('should prioritize x-mcp-destination over basic auth', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'basic',
        'x-mcp-destination': 'TRIAL',
        'x-sap-login': 'user',
        'x-sap-password': 'pass',
      };
      
      const result = validateAuthHeaders(headers);
      
      // x-mcp-destination should take priority (checked before x-sap-auth-type)
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.authType).toBe('jwt');
    });

    it('should return error when x-mcp-destination is empty', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-mcp-destination': '   ',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('x-mcp-destination header is empty'))).toBe(true);
    });
  });

  describe('Direct JWT authentication (medium priority)', () => {
    it('should validate direct JWT auth', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'jwt',
        'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.DIRECT_JWT);
      expect(result.config?.jwtToken).toBeDefined();
      expect(result.config?.authType).toBe('jwt');
    });

    it('should validate direct JWT auth with refresh token and UAA config', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'jwt',
        'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        'x-sap-refresh-token': 'refresh_token_here',
        'x-sap-uaa-url': 'https://uaa.test.com',
        'x-sap-uaa-client-id': 'client_id',
        'x-sap-uaa-client-secret': 'client_secret',
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
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'jwt',
        'x-sap-jwt-token': 'short',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('x-sap-jwt-token appears to be invalid'))).toBe(true);
    });

    it('should handle array header values', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': ['https://test.sap.com'],
        'x-sap-auth-type': ['jwt'],
        'x-sap-jwt-token': ['eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'],
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.DIRECT_JWT);
    });
  });

  describe('Basic authentication (lowest priority)', () => {
    it('should validate basic auth', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'basic',
        'x-sap-login': 'username',
        'x-sap-password': 'password',
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
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'basic',
        'x-sap-password': 'password',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Basic authentication requires'))).toBe(true);
    });

    it('should return error when password is missing', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'basic',
        'x-sap-login': 'username',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Basic authentication requires'))).toBe(true);
    });

    it('should return error when username is empty', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'basic',
        'x-sap-login': '   ',
        'x-sap-password': 'password',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('x-sap-login header is empty'))).toBe(true);
    });

    it('should return error when password is empty', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'basic',
        'x-sap-login': 'username',
        'x-sap-password': '   ',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('x-sap-password header is empty'))).toBe(true);
    });
  });

  describe('Priority handling', () => {
    it('should prioritize x-sap-destination over x-mcp-destination', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-destination': 'S4HANA_E19',
        'x-sap-auth-type': 'jwt',
        'x-mcp-destination': 'TRIAL',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.SAP_DESTINATION);
      expect(result.config?.destination).toBe('S4HANA_E19');
    });

    it('should prioritize x-mcp-destination over direct JWT', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'jwt',
        'x-mcp-destination': 'TRIAL',
        'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.priority).toBe(AuthMethodPriority.MCP_DESTINATION);
      expect(result.config?.destination).toBe('TRIAL');
      expect(result.config?.jwtToken).toBeUndefined();
    });

    it('should prioritize direct JWT over basic when both present (should not happen in practice)', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'jwt', // JWT type, but also basic headers
        'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        'x-sap-login': 'user',
        'x-sap-password': 'pass',
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
        'x-sap-url': '  https://test.sap.com  ',
        'x-sap-auth-type': '  jwt  ',
        'x-sap-jwt-token': '  eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...  ',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.sapUrl).toBe('https://test.sap.com');
      expect(result.config?.authType).toBe('jwt');
    });

    it('should handle case-insensitive auth type', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'https://test.sap.com',
        'x-sap-auth-type': 'JWT', // uppercase
        'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.authType).toBe('jwt');
    });

    it('should handle http URLs', () => {
      const headers: IncomingHttpHeaders = {
        'x-sap-url': 'http://test.sap.com',
        'x-sap-auth-type': 'jwt',
        'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
      };
      
      const result = validateAuthHeaders(headers);
      
      expect(result.isValid).toBe(true);
      expect(result.config?.sapUrl).toBe('http://test.sap.com');
    });
  });
});

