# Documentation Index

Complete documentation for `@mcp-abap-adt/header-validator` package.

## Documentation Structure

- **[Architecture](architecture/ARCHITECTURE.md)** - System architecture, priority system with Mermaid diagrams, and valid header combinations
- **[Priority Diagram](architecture/PRIORITY_DIAGRAM.md)** - Detailed visual flow diagram and composition matrix
- **[Development](development/DEVELOPMENT.md)** - Development guide, testing, and contribution guidelines
- **[Usage](using/USAGE.md)** - API reference, usage examples, and header combinations

## Quick Start

```typescript
import { validateAuthHeaders } from '@mcp-abap-adt/header-validator';

const result = validateAuthHeaders(headers);
if (result.isValid && result.config) {
  // Use validated configuration
}
```

See [Usage Guide](using/USAGE.md) for detailed examples.

