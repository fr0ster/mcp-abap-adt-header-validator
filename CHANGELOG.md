# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.8] - 2025-12-13

### Changed
- Dependency bump: `@mcp-abap-adt/interfaces` to `^0.1.16` for consistency with latest interfaces release

## [0.1.7] - 2025-01-XX

### Added
- **Header Sets Documentation**: Added comprehensive documentation section on header sets in `USAGE.md`
  - **Set 1: Basic Authentication Set** - Documents that `x-sap-login`, `x-sap-password`, and `x-sap-auth-type: basic` must be provided together
  - **Set 2: UAA Refresh Token Set** - Documents that UAA headers (`x-sap-uaa-url`, `x-sap-uaa-client-id`, `x-sap-uaa-client-secret`) must be provided together when used (optional)
  - **Set 3: Direct JWT Authentication** - Documents minimal set requirements for JWT authentication
  - Includes validation rules, examples, and error scenarios for each set

### Changed
- **Header Constants Migration**: Replaced all hardcoded header strings with constants from `@mcp-abap-adt/interfaces`
  - Updated `@mcp-abap-adt/interfaces` dependency from `^0.1.1` to `^0.1.2`
  - All header references now use constants (e.g., `HEADER_SAP_LOGIN`, `HEADER_SAP_PASSWORD`, `HEADER_SAP_AUTH_TYPE`, etc.)
  - Improved type safety and consistency across packages

### Fixed
- **Basic Auth Validation**: Enhanced validation to ensure `x-sap-login` and `x-sap-password` are provided together as a cohesive set
  - Validation now checks if either header is present, both must be present
  - Improved error messages for missing basic auth headers
- **UAA Headers Validation**: Enhanced validation for UAA refresh token headers
  - Added warning when UAA headers are partially provided
  - Clarified that UAA headers are optional and only used for token refresh
  - UAA headers do not affect authorization validation

### Technical
- **Test Updates**: Updated all tests to use header constants instead of hardcoded strings
- **Jest Configuration**: Updated Jest to version 30.2.0 and ts-jest to 29.2.5 (aligned with auth-providers package)
- **Dependencies**: Added `jest-util@^30.2.0` as dev dependency to resolve Jest compatibility issues

## [0.1.6] - 2025-12-05

### Changed
- **Version Alignment**: Updated `@mcp-abap-adt/interfaces` dependency from `^0.1.0` to `^0.1.1`

## [0.1.5] - 2025-12-05

### Changed
- **Dependencies Update**: Updated dependencies and added `.npmrc` configuration
  - Added `.npmrc` with `prefer-online=true` to ensure packages are fetched from npm registry

## [0.1.4] - 2025-12-04

### Added
- **Interfaces Package Integration**: Migrated to use `@mcp-abap-adt/interfaces` package for all interface definitions
  - All interfaces now imported from shared package
  - Backward compatibility maintained with type aliases
  - Dependency on `@mcp-abap-adt/interfaces@^0.1.0` added

### Changed
- **Interface Renaming**: Interfaces renamed to follow `I` prefix convention:
  - `ValidatedAuthConfig` → `IValidatedAuthConfig` (type alias for backward compatibility)
  - `HeaderValidationResult` → `IHeaderValidationResult` (type alias for backward compatibility)
  - `AuthType` and `AuthMethodPriority` now imported from interfaces package
  - Old names still work via type aliases for backward compatibility

## [0.1.3] - 2025-12-01

### Fixed
- **x-mcp-destination validation** – fixed issue where `x-mcp-destination` header incorrectly required `x-sap-url`:
  - `x-mcp-destination` now works identically to `x-sap-destination` - URL is automatically derived from service key
  - `x-sap-url` is now optional for `x-mcp-destination` (and will be ignored with a warning if provided)
  - Fixed validation logic to check `x-mcp-destination` immediately after `x-sap-destination`, regardless of `x-sap-url` presence
  - This fixes issues on Windows where `x-mcp-destination` was being ignored

### Changed
- **Header case handling** – improved header value extraction to check both lowercase and original case:
  - `getHeaderValue()` now checks lowercase first (Node.js normalizes headers), then original case for compatibility
  - Both `validateSapDestinationAuth()` and `validateMcpDestinationAuth()` check headers in both cases
  - Better cross-platform compatibility, especially for Windows

- **Validation order** – improved validation priority logic:
  - `x-mcp-destination` is now checked immediately after `x-sap-destination`, before checking for `x-sap-url`
  - This ensures destination-based authentication is prioritized correctly
  - URL validation only happens for non-destination authentication methods

- **Documentation updates** – updated architecture documentation:
  - Updated `ARCHITECTURE.md` to reflect that `x-sap-url` is not required for `x-mcp-destination`
  - Updated `PRIORITY_DIAGRAM.md` with correct header requirements
  - Updated examples to show `x-mcp-destination` without `x-sap-url`

### Added
- **Test coverage** – added tests for new validation behavior:
  - Test for `x-mcp-destination` without `x-sap-url` (should work)
  - Test for warning when `x-sap-url` is provided with `x-mcp-destination`
  - Updated existing tests to reflect new validation logic

## [0.1.2] - 2025-11-30

### Changed
- **Improved header validation logic** - Absence of headers is no longer treated as an error (allows .env file usage)
- **MCP destination validation** - `validateMcpDestinationAuth` now accepts optional `sapUrl` parameter and validates it internally
- **Better error handling** - Validator returns empty errors array when no headers provided (not an error, user may use .env file)

### Fixed
- **Test updates** - Updated tests to reflect new validation logic where missing headers are not errors

## [0.1.1] - 2025-11-30

### Fixed
- Initial published version

## [0.1.0] - 2025-11-30

### Added
- **Header validation** - Validates authentication headers for MCP ABAP ADT servers
- **Priority system** - Automatically prioritizes authentication methods:
  - Destination-based authentication (highest priority)
  - Direct JWT authentication (medium priority)
  - Basic authentication (lowest priority)
- **Error reporting** - Detailed error messages for invalid configurations
- **Warning system** - Warnings for conflicting or ignored headers
- **TypeScript support** - Full TypeScript definitions and type safety
- **Unit tests** - Comprehensive test suite with mocks (34 tests)
- **Documentation** - Complete README with examples and API reference

### Technical Details
- **Dependencies**: None (zero dependencies)
- **Node.js version**: >= 18.0.0
- **Module system**: CommonJS
- **Build output**: TypeScript compiled to JavaScript with type definitions
