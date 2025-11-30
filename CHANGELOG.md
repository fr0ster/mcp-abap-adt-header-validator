# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

