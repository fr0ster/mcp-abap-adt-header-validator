# Development Guide

## Project Structure

```
mcp-abap-adt-header-validator/
├── src/
│   ├── types.ts              # TypeScript types and interfaces
│   ├── headerValidator.ts    # Main validation logic
│   ├── index.ts              # Public API exports
│   └── __tests__/
│       └── headerValidator.test.ts  # Unit tests with mocks
├── docs/                     # Documentation
├── dist/                     # Compiled output
└── package.json
```

## Development Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run test:check
```

## Testing

### Test Strategy

**Unit tests with mocks** - All tests use mocked header inputs to validate logic without external dependencies.

### Test Coverage

- ✅ Error cases (missing headers, invalid values)
- ✅ All authentication methods (SAP destination, MCP destination, JWT, Basic)
- ✅ Priority resolution
- ✅ Edge cases (whitespace, arrays, case sensitivity)
- ✅ Warnings for conflicting headers

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- headerValidator.test.ts
```

### Test Structure

Tests are organized by authentication method:
- Error cases
- SAP destination-based authentication
- MCP destination-based authentication
- Direct JWT authentication
- Basic authentication
- Priority handling
- Edge cases

## Code Style

- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for functions, PascalCase for types
- **Comments**: Explain "why", not "what"
- **Error Messages**: Clear, actionable, include header names

## Adding New Features

1. **Update Types** (`src/types.ts`)
   - Add new priority if needed
   - Extend `ValidatedAuthConfig` interface

2. **Implement Validation** (`src/headerValidator.ts`)
   - Add validation function
   - Integrate into priority system

3. **Add Tests** (`src/__tests__/headerValidator.test.ts`)
   - Test valid cases
   - Test error cases
   - Test priority resolution

4. **Update Documentation**
   - Architecture docs
   - Usage examples
   - CHANGELOG

## Build Process

```bash
# Clean build
npm run build

# Fast build (no clean)
npm run build:fast

# Type check only
npm run test:check
```

## Publishing

```bash
# Build before publishing
npm run build

# Publish
npm publish
```

The `prepublishOnly` script ensures the package is built before publishing.

