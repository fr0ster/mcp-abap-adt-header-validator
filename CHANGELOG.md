# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

