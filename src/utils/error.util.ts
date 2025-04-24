export enum ErrorType {
  UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
}

export interface IMcpError extends Error {
  type: ErrorType;
  statusCode?: number;
  originalError?: unknown;
  name: string;
}

export function createMcpError(
  message: string,
  type: ErrorType,
  statusCode?: number,
  originalError?: unknown,
): IMcpError {
  const error = new Error(message) as IMcpError;
  error.name = "McpError";
  error.type = type;
  error.statusCode = statusCode;
  error.originalError = originalError;
  return error;
}

export function createUnexpectedError(
  message: string = "An unexpected error occurred",
  originalError?: unknown,
): IMcpError {
  return createMcpError(
    message,
    ErrorType.UNEXPECTED_ERROR,
    undefined,
    originalError,
  );
}

export function ensureMcpError(error: unknown): IMcpError {
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    "name" in error &&
    (error as { name: string }).name === "McpError"
  ) {
    return error as IMcpError;
  }

  if (error instanceof Error) {
    return createUnexpectedError(error.message, error);
  }

  return createUnexpectedError(String(error));
}

export function formatErrorForMcpTool(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
} {
  const mcpError = ensureMcpError(error);

  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${mcpError.message}`,
      },
    ],
  };
}
