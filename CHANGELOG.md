# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2024-12-04

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

