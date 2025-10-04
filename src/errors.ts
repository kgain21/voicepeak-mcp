// Error handling utilities

export enum ErrorCode {
	// Validation errors
	INVALID_TEXT = "INVALID_TEXT",
	INVALID_NARRATOR = "INVALID_NARRATOR",
	INVALID_FILE_PATH = "INVALID_FILE_PATH",
	PATH_TRAVERSAL_ATTEMPT = "PATH_TRAVERSAL_ATTEMPT",

	// Process errors
	PROCESS_TIMEOUT = "PROCESS_TIMEOUT",
	PROCESS_FAILED = "PROCESS_FAILED",
	TOO_MANY_PROCESSES = "TOO_MANY_PROCESSES",

	// File system errors
	FILE_NOT_FOUND = "FILE_NOT_FOUND",
	FILE_WRITE_ERROR = "FILE_WRITE_ERROR",
	TEMP_FILE_ERROR = "TEMP_FILE_ERROR",

	// Unknown errors
	UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class VoicepeakError extends Error {
	constructor(
		message: string,
		public readonly code: ErrorCode,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "VoicepeakError";
	}
}

export interface ErrorResponse {
	content: Array<{ type: "text"; text: string }>;
}

export function handleToolError(error: unknown): ErrorResponse {
	// Log error for debugging
	console.error("[VoicePeak MCP] Error:", error);

	if (error instanceof VoicepeakError) {
		return {
			content: [
				{
					type: "text",
					text: `Error [${error.code}]: ${error.message}`,
				},
			],
		};
	}

	if (error instanceof Error) {
		// Hide internal details from user
		const sanitizedMessage = error.message
			.replace(/\/[^\s]+/g, "[path]") // Hide file paths
			.substring(0, 200); // Limit message length

		return {
			content: [
				{
					type: "text",
					text: `Error: ${sanitizedMessage}`,
				},
			],
		};
	}

	return {
		content: [
			{
				type: "text",
				text: "An unexpected error occurred. Please try again.",
			},
		],
	};
}
