# @mcp-abap-adt/header-validator

Header validator for MCP ABAP ADT - validates and prioritizes authentication headers.

## Features

- ✅ **Header Validation**: Validates authentication headers for MCP ABAP ADT servers
- ✅ **Priority System**: Automatically prioritizes authentication methods
- ✅ **Error Reporting**: Detailed error messages and warnings
- ✅ **Type Safety**: Full TypeScript support with type definitions

## Responsibilities and Design Principles

### Core Development Principle

**Interface-Only Communication**: This package follows a fundamental development principle: **all interactions with external dependencies happen ONLY through interfaces**. The code knows **NOTHING beyond what is defined in the interfaces**.

This means:
- Does not know about concrete implementation classes from other packages
- Does not know about internal data structures or methods not defined in interfaces
- Does not make assumptions about implementation behavior beyond interface contracts
- Does not access properties or methods not explicitly defined in interfaces

This principle ensures:
- **Loose coupling**: Validator is decoupled from concrete implementations in other packages
- **Flexibility**: New implementations can be added without modifying validator
- **Testability**: Easy to mock dependencies for testing
- **Maintainability**: Changes to implementations don't affect validator

### Package Responsibilities

This package is responsible for:

1. **Header validation**: Validates authentication headers from HTTP requests
2. **Priority resolution**: Determines which authentication method to use based on header presence and priority rules
3. **Configuration extraction**: Extracts authentication configuration from headers
4. **Error reporting**: Provides detailed validation errors and warnings

#### What This Package Does

- **Validates headers**: Checks authentication headers for validity and completeness
- **Prioritizes methods**: Determines authentication method priority (SAP destination > MCP destination > JWT token > Basic auth)
- **Extracts config**: Extracts `SapConfig` from validated headers
- **Reports errors**: Provides detailed error messages and warnings for invalid configurations
- **Type safety**: Returns typed validation results with configuration objects

#### What This Package Does NOT Do

- **Does NOT handle authentication**: Authentication is handled by `@mcp-abap-adt/connection` and `@mcp-abap-adt/auth-broker`
- **Does NOT manage tokens**: Token management is handled by `@mcp-abap-adt/auth-broker`
- **Does NOT make HTTP requests**: HTTP requests are handled by `@mcp-abap-adt/connection`
- **Does NOT store configuration**: Configuration storage is handled by consumers
- **Does NOT know about destinations**: Destination resolution is handled by `@mcp-abap-adt/auth-broker`

### External Dependencies

This package interacts with external packages **ONLY through interfaces**:

- **`@mcp-abap-adt/connection`**: Uses `SapConfig` type for configuration - does not know about concrete connection implementation
- **No direct dependencies on other packages**: All interactions happen through well-defined types and interfaces

## Installation

```bash
npm install @mcp-abap-adt/header-validator
```

## Usage

```typescript
import { validateAuthHeaders } from '@mcp-abap-adt/header-validator';
import { IncomingHttpHeaders } from 'http';

const headers: IncomingHttpHeaders = {
  'x-sap-url': 'https://test.sap.com',
  'x-mcp-destination': 'TRIAL',
  // Note: x-sap-auth-type not needed - always uses JWT
};

const result = validateAuthHeaders(headers);

if (result.isValid && result.config) {
  console.log('Auth method:', result.config.priority);
  console.log('Destination:', result.config.destination);
} else {
  console.error('Validation errors:', result.errors);
}
```

## Authentication Methods and Priorities

The validator supports four authentication methods, ordered by priority (highest to lowest):

### 1. SAP Destination-Based Authentication (Highest Priority)

**Priority**: `AuthMethodPriority.SAP_DESTINATION` (4)

**Required Headers**:
- `x-sap-url` - SAP system URL
- `x-sap-destination` - Destination name (e.g., "S4HANA_E19")

**Optional Headers**:
- `x-sap-client` - SAP client number
- `x-sap-login` / `x-sap-password` - Username/password (edge cases)

**Description**: Simplest configuration - uses AuthBroker to manage tokens. Always uses JWT authentication. No `x-sap-auth-type` header needed.

**Example**:
```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
};
```

**Notes**:
- Does NOT require `x-sap-auth-type` (always JWT)
- If `x-sap-auth-type` is provided, it will be ignored (warning issued)
- If `x-sap-jwt-token` is also provided, it will be ignored (warning issued)
- Requires AuthBroker to be initialized in the server
- Automatically handles token refresh and validation

### 2. MCP Destination-Based Authentication

**Priority**: `AuthMethodPriority.MCP_DESTINATION` (3)

**Required Headers**:
- `x-sap-url` - SAP system URL
- `x-mcp-destination` - Destination name (e.g., "TRIAL", "PRODUCTION")

**Optional Headers**:
- `x-sap-client` - SAP client number

**Description**: Uses AuthBroker to manage tokens based on destination. Tokens are loaded from `{destination}.env` files, validated, and automatically refreshed when needed. Always uses JWT authentication.

**Example**:
```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-mcp-destination': 'TRIAL',
  // Note: x-sap-auth-type not needed - always uses JWT
};
```

**Notes**:
- Does NOT require `x-sap-auth-type` (always JWT)
- If `x-sap-auth-type` is provided, it will be ignored (warning issued)
- If `x-sap-jwt-token` is also provided, it will be ignored (warning issued)
- Requires AuthBroker to be initialized in the server
- Automatically handles token refresh and validation

### 3. Direct JWT Authentication (Medium Priority)

**Priority**: `AuthMethodPriority.DIRECT_JWT` (2)

**Required Headers**:
- `x-sap-url` - SAP system URL
- `x-sap-auth-type` - Must be `jwt` or `xsuaa`
- `x-sap-jwt-token` - JWT access token

**Optional Headers**:
- `x-sap-refresh-token` - Refresh token for automatic token renewal
- `x-sap-uaa-url` / `uaa-url` - UAA URL
- `x-sap-uaa-client-id` / `uaa-client-id` - UAA Client ID
- `x-sap-uaa-client-secret` / `uaa-client-secret` - UAA Client Secret
- `x-sap-client` - SAP client number

**Description**: Direct JWT token authentication. Token is provided directly in headers.

**Example**:
```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  'x-sap-refresh-token': 'refresh_token_here', // optional
};
```

**Notes**:
- Token must be at least 10 characters long
- Refresh token is optional but recommended for automatic token renewal

### 4. Basic Authentication (Lowest Priority)

**Priority**: `AuthMethodPriority.BASIC` (1)

**Required Headers**:
- `x-sap-url` - SAP system URL
- `x-sap-auth-type` - Must be `basic`
- `x-sap-login` - Username
- `x-sap-password` - Password

**Description**: Basic HTTP authentication with username and password.

**Example**:
```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'basic',
  'x-sap-login': 'username',
  'x-sap-password': 'password',
};
```

**Notes**:
- Used primarily for on-premise SAP systems
- Credentials are sent in plain text (use HTTPS in production)

## Valid Header Combinations

### ✅ Valid Combinations

#### 1. SAP Destination Only (Simplest - Recommended)
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
}
// No x-sap-auth-type needed - always JWT
```

#### 2. MCP Destination Only
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-mcp-destination': 'TRIAL',
  // Note: x-sap-auth-type not needed - always uses JWT
}
```

#### 3. Direct JWT Only
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  'x-sap-refresh-token': 'refresh_token', // optional
}
```

#### 4. Basic Auth Only
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'basic',
  'x-sap-login': 'username',
  'x-sap-password': 'password',
}
```

#### 5. SAP Destination + Auth Type (Warning Issued)
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
  'x-sap-auth-type': 'jwt', // ignored (warning)
}
```
**Result**: SAP Destination auth is used, auth-type is ignored (warning issued)

#### 6. Destination + Direct JWT (Warning Issued)
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
  'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...', // ignored
}
```
**Result**: SAP Destination auth is used (Priority 4), direct JWT token is ignored (warning issued)

#### 7. Multiple Destinations (SAP Takes Priority)
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19', // Priority 4
  'x-mcp-destination': 'TRIAL',      // Priority 3 - ignored
}
```
**Result**: SAP Destination auth is used, MCP destination is ignored

### ❌ Invalid Combinations

#### 1. Missing Required Headers
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  // Missing x-sap-auth-type
}
```
**Error**: `x-sap-auth-type header is required`

#### 2. Invalid Auth Type
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'invalid',
}
```
**Error**: `x-sap-auth-type must be one of: jwt, xsuaa, basic`

#### 3. JWT Auth Without Token or Destination
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  // Missing x-sap-destination, x-mcp-destination, and x-sap-jwt-token
}
```
**Error**: `JWT authentication requires either x-sap-destination, x-mcp-destination, or x-sap-jwt-token header`

#### 4. Basic Auth Without Credentials
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'basic',
  // Missing x-sap-login and/or x-sap-password
}
```
**Error**: `Basic authentication requires x-sap-login and x-sap-password headers`

#### 5. Empty Values
```typescript
{
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': '   ', // empty after trim
}
```
**Error**: `x-sap-destination header is empty`

#### 6. Invalid URL
```typescript
{
  'x-sap-url': 'not-a-valid-url',
  'x-sap-auth-type': 'jwt',
  'x-sap-jwt-token': 'token',
}
```
**Error**: `x-sap-url is not a valid URL`

## Priority Resolution

When multiple authentication methods are detected, the validator automatically selects the highest priority method:

1. **SAP Destination** (Priority 4) - Always selected if `x-sap-destination` is present
2. **MCP Destination** (Priority 3) - Selected if `x-mcp-destination` is present (always uses JWT, no `x-sap-auth-type` needed)
3. **Direct JWT** (Priority 2) - Selected if JWT token is provided (requires `x-sap-auth-type: jwt`)
4. **Basic** (Priority 1) - Selected only if basic auth headers are present (requires `x-sap-auth-type: basic`)

### Example: Priority Resolution

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',  // Priority 4 (selected)
  'x-sap-auth-type': 'jwt',           // Ignored (warning)
  'x-mcp-destination': 'TRIAL',       // Priority 3 (ignored)
  'x-sap-jwt-token': 'token',         // Priority 2 (ignored)
  'x-sap-login': 'user',              // Priority 1 (ignored)
  'x-sap-password': 'pass',           // Priority 1 (ignored)
};

const result = validateAuthHeaders(headers);
// result.config.priority === AuthMethodPriority.SAP_DESTINATION (4)
// result.warnings includes: "x-sap-auth-type is ignored when x-sap-destination is present"
// result.warnings includes: "x-sap-jwt-token is ignored when x-sap-destination is present"
```

## API Reference

### `validateAuthHeaders(headers?: IncomingHttpHeaders): HeaderValidationResult`

Validates and prioritizes authentication headers.

**Parameters**:
- `headers` - HTTP headers object (optional)

**Returns**: `HeaderValidationResult` object with:
- `isValid: boolean` - Whether the configuration is valid
- `config?: ValidatedAuthConfig` - Validated authentication configuration (if valid)
- `errors: string[]` - List of validation errors
- `warnings: string[]` - List of warnings (e.g., ignored headers)

### `ValidatedAuthConfig`

```typescript
interface ValidatedAuthConfig {
  priority: AuthMethodPriority;  // Authentication method priority
  authType: AuthType;            // 'jwt' | 'xsuaa' | 'basic'
  sapUrl: string;                // SAP system URL
  destination?: string;          // Destination name (for destination-based auth)
  jwtToken?: string;             // JWT token (for direct JWT auth)
  refreshToken?: string;         // Refresh token (optional, for JWT auth)
  username?: string;             // Username (for basic auth)
  password?: string;             // Password (for basic auth)
  errors: string[];              // Validation errors
  warnings: string[];            // Warnings
}
```

### `AuthMethodPriority`

Enumeration of authentication method priorities:

```typescript
enum AuthMethodPriority {
  DESTINATION_BASED = 3,  // Highest priority
  DIRECT_JWT = 2,         // Medium priority
  BASIC = 1,              // Lowest priority
  NONE = 0                // Invalid/No auth
}
```

## Error Handling

The validator provides detailed error messages for common issues:

- Missing required headers
- Invalid header values
- Empty header values (after trimming whitespace)
- Invalid URL format
- Invalid authentication type
- Missing authentication credentials

All errors are collected in the `errors` array, and the validation result includes `isValid: false` if any errors are present.

## Warnings

The validator issues warnings for:

- Conflicting headers (e.g., destination and direct JWT token both present)
- Multiple authentication methods with the same priority (should not happen in practice)

Warnings do not prevent validation from succeeding but indicate potential configuration issues.

## Examples

### Example 1: SAP Destination Auth (Simplest)

```typescript
import { validateAuthHeaders } from '@mcp-abap-adt/header-validator';

const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-destination': 'S4HANA_E19',
};

const result = validateAuthHeaders(headers);

if (result.isValid && result.config) {
  console.log('Using SAP destination-based auth');
  console.log('Destination:', result.config.destination);
  console.log('Priority:', result.config.priority);
  console.log('Auth Type:', result.config.authType); // Always 'jwt'
}
```

### Example 2: MCP Destination Auth

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-mcp-destination': 'TRIAL',
  // Note: x-sap-auth-type not needed - always uses JWT
};

const result = validateAuthHeaders(headers);

if (result.isValid && result.config) {
  console.log('Using MCP destination-based auth');
  console.log('Destination:', result.config.destination);
}
```

### Example 3: Direct JWT Auth

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  'x-sap-jwt-token': 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  'x-sap-refresh-token': 'refresh_token',
};

const result = validateAuthHeaders(headers);

if (result.isValid && result.config) {
  console.log('Using direct JWT auth');
  console.log('Token:', result.config.jwtToken);
}
```

### Example 4: Error Handling

```typescript
const headers = {
  'x-sap-url': 'https://test.sap.com',
  'x-sap-auth-type': 'jwt',
  // Missing required headers
};

const result = validateAuthHeaders(headers);

if (!result.isValid) {
  console.error('Validation failed:');
  result.errors.forEach(error => console.error(`  - ${error}`));
}
```

## Documentation

Complete documentation is available in the [`docs/`](docs/) directory:

- **[Architecture](docs/architecture/ARCHITECTURE.md)** - System architecture, priority system, and valid header combinations
- **[Development](docs/development/DEVELOPMENT.md)** - Development guide and testing
- **[Usage](docs/using/USAGE.md)** - API reference and usage examples

See [docs/README.md](docs/README.md) for the complete documentation index.

## License

MIT

