/**
 * Types for header validator
 */

import { IncomingHttpHeaders } from 'http';
import type { AuthType } from '@mcp-abap-adt/interfaces';
import { AuthMethodPriority, type IValidatedAuthConfig, type IHeaderValidationResult } from '@mcp-abap-adt/interfaces';

// Re-export for backward compatibility
export type { AuthType };
export { AuthMethodPriority };
export type ValidatedAuthConfig = IValidatedAuthConfig;
export type HeaderValidationResult = IHeaderValidationResult;

