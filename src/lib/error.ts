export enum ErrorType {
	UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
}

export interface IMcpError extends Error {
	type: ErrorType
	statusCode?: number
	originalError?: unknown
	name: string
}

export function createMcpError(
	message: string,
	type: ErrorType,
	statusCode?: number,
	originalError?: unknown,
): IMcpError {
	const error = new Error(message) as IMcpError
	error.name = "McpError"
	error.type = type
	error.statusCode = statusCode
	error.originalError = originalError

	return error
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
	)
}

export function ensureMcpError(error: unknown): IMcpError {
	if (
		error &&
		typeof error === "object" &&
		"type" in error &&
		"name" in error &&
		(error as { name: string }).name === "McpError"
	) {
		return error as IMcpError
	}

	if (error instanceof Error) {
		return createUnexpectedError(error.message, error)
	}

	return createUnexpectedError(String(error))
}

export function formatErrorForMcpTool(error: unknown): {
	content: Array<{ type: "text"; text: string }>
} {
	const mcpError = ensureMcpError(error)

	return {
		content: [
			{
				type: "text" as const,
				text: `Error: ${mcpError.message}`,
			},
		],
	}
}

export function formatDecodeError(error: {
	message?: string
	context?: ReadonlyArray<{ key?: string; type?: { name: string } }>
	value?: unknown
}): string {
	if (error.message) {
		return `- ${error.context?.[0]?.key || "root"}: ${error.message}`
	}

	const path =
		error.context
			?.map((c) => c.key)
			.filter(Boolean)
			.join(".") || "root"

	const expectedType =
		error.context?.[error.context.length - 1]?.type?.name || "unknown"

	return `- ${path}: Expected ${expectedType}, got ${typeof error.value} (${JSON.stringify(error.value)})`
}
