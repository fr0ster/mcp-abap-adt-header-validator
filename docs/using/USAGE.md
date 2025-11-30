# Usage Guide

## Quick Start

```typescript
import { validateAuthHeaders } from '@mcp-abap-adt/header-validator';
import { IncomingHttpHeaders } from 'http';

const headers: IncomingHttpHeaders = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
};

const result = validateAuthHeaders(headers);

if (result.isValid && result.config) {
  console.log('Priority:', result.config.priority);
  console.log('Destination:', result.config.destination);
} else {
  console.error('Errors:', result.errors);
}
```

## API Reference

### `validateAuthHeaders(headers?: IncomingHttpHeaders): HeaderValidationResult`

Validates and prioritizes authentication headers.

**Parameters**:
- `headers` - HTTP headers object (optional)

**Returns**: `HeaderValidationResult` with:
- `isValid: boolean` - Whether configuration is valid
- `config?: ValidatedAuthConfig` - Validated configuration (if valid)
- `errors: string[]` - Validation errors
- `warnings: string[]` - Warnings (e.g., ignored headers)

## Authentication Methods

### 1. SAP Destination (Simplest - Recommended)

**Priority**: 4 (Highest)

**Required**:
- `x-sap-url`
- `x-sap-destination`

**Optional**:
- `x-sap-client`
- `x-sap-login` / `x-sap-password` (edge cases)

**Example**:
```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
  'x-sap-client': '100', // optional
};

const result = validateAuthHeaders(headers);
// result.config.priority === 4 (SAP_DESTINATION)
// result.config.authType === 'jwt'
```

**Notes**:
- No `x-sap-auth-type` needed (always JWT)
- Uses AuthBroker for token management
- Simplest configuration

### 2. MCP Destination

**Priority**: 3

**Required**:
- `x-sap-url`
- `x-sap-auth-type: jwt` or `xsuaa`
- `x-mcp-destination`

**Optional**:
- `x-sap-client`

**Example**:
```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-mcp-destination': 'TRIAL',
};

const result = validateAuthHeaders(headers);
// result.config.priority === 3 (MCP_DESTINATION)
```

### 3. Direct JWT

**Priority**: 2

**Required**:
- `x-sap-url`
- `x-sap-auth-type: jwt` or `xsuaa`
- `x-sap-jwt-token`

**Optional**:
- `x-sap-refresh-token`
- `x-sap-uaa-url` / `uaa-url`
- `x-sap-uaa-client-id` / `uaa-client-id`
- `x-sap-uaa-client-secret` / `uaa-client-secret`
- `x-sap-client`

**Example**:
```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  'x-sap-refresh-token': 'refresh_token', // optional
  'x-sap-uaa-url': 'https://uaa.test.com', // optional
};

const result = validateAuthHeaders(headers);
// result.config.priority === 2 (DIRECT_JWT)
```

### 4. Basic Authentication

**Priority**: 1 (Lowest)

**Required**:
- `x-sap-url`
- `x-sap-auth-type: basic`
- `x-sap-login`
- `x-sap-password`

**Example**:
```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'basic',
  'x-sap-login': 'username',
  'x-sap-password': 'password',
};

const result = validateAuthHeaders(headers);
// result.config.priority === 1 (BASIC)
```

## Priority Resolution Examples

### Example 1: SAP Destination Takes Priority

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',        // Priority 4
  'x-sap-auth-type': 'jwt',                // Ignored (warning)
  'x-mcp-destination': 'TRIAL',            // Ignored (warning)
  'x-sap-jwt-token': 'token',              // Ignored (warning)
};

const result = validateAuthHeaders(headers);
// result.config.priority === 4 (SAP_DESTINATION)
// result.warnings.length === 3
```

### Example 2: MCP Destination Over Direct JWT

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-mcp-destination': 'TRIAL',            // Priority 3
  'x-sap-jwt-token': 'token',             // Ignored (warning)
};

const result = validateAuthHeaders(headers);
// result.config.priority === 3 (MCP_DESTINATION)
```

### Example 3: Direct JWT Over Basic

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-sap-jwt-token': 'token',             // Priority 2
  'x-sap-login': 'user',                  // Ignored
  'x-sap-password': 'pass',               // Ignored
};

const result = validateAuthHeaders(headers);
// result.config.priority === 2 (DIRECT_JWT)
```

## Error Handling

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  // Missing required headers
};

const result = validateAuthHeaders(headers);

if (!result.isValid) {
  result.errors.forEach(error => {
    console.error(`Error: ${error}`);
  });
}
```

## Common Patterns

### Pattern 1: Simple Destination-Based

```typescript
// Simplest - just destination
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
};
```

### Pattern 2: Destination with Client

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
  'x-sap-client': '100',
};
```

### Pattern 3: Direct JWT with Refresh

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  'x-sap-refresh-token': 'refresh_token',
};
```

### Pattern 4: Direct JWT with UAA Config

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  'x-sap-uaa-url': 'https://uaa.test.com',
  'x-sap-uaa-client-id': 'client_id',
  'x-sap-uaa-client-secret': 'client_secret',
};
```

## Integration with MCP Server

```typescript
import { validateAuthHeaders } from '@mcp-abap-adt/header-validator';

// In your HTTP handler
async function handleRequest(req: IncomingMessage) {
  const result = validateAuthHeaders(req.headers);
  
  if (!result.isValid) {
    return { error: result.errors.join(', ') };
  }
  
  const config = result.config!;
  
  // Use config based on priority
  switch (config.priority) {
    case AuthMethodPriority.SAP_DESTINATION:
    case AuthMethodPriority.MCP_DESTINATION:
      // Use AuthBroker.getToken(config.destination!)
      break;
    case AuthMethodPriority.DIRECT_JWT:
      // Use config.jwtToken directly
      break;
    case AuthMethodPriority.BASIC:
      // Use config.username and config.password
      break;
  }
}
```

## Type Definitions

See [Architecture Documentation](../architecture/ARCHITECTURE.md) for complete type definitions and priority enum values.

