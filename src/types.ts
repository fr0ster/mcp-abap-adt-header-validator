/**
 * Types for header validator
 */

import type { AuthType } from '@mcp-abap-adt/interfaces';
import {
  AuthMethodPriority,
  type IHeaderValidationResult,
  type IValidatedAuthConfig,
} from '@mcp-abap-adt/interfaces';

// Re-export for backward compatibility
export type { AuthType };
export { AuthMethodPriority };
export type ValidatedAuthConfig = IValidatedAuthConfig;
export type HeaderValidationResult = IHeaderValidationResult;
