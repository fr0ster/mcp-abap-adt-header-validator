/**
 * Types for header validator
 */

import type {
  AuthType,
  IHeaderValidationResult,
  IValidatedAuthConfig,
} from '@mcp-abap-adt/interfaces-auth-sap';
import { AuthMethodPriority } from '@mcp-abap-adt/interfaces-auth-sap';

// Re-export for backward compatibility
export type { AuthType };
export { AuthMethodPriority };
export type ValidatedAuthConfig = IValidatedAuthConfig;
export type HeaderValidationResult = IHeaderValidationResult;
