// Input validation and sanitization utilities

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { CONFIG } from "./types.js";

export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "ValidationError";
	}
}

/**
 * Sanitizes text input by removing potentially dangerous characters
 */
export function sanitizeText(text: string): string {
	if (!text || typeof text !== "string") {
		throw new ValidationError("Text is required", "INVALID_TEXT");
	}

	if (text.length > 5000) {
		throw new ValidationError(
			"Text is too long (max 5000 characters)",
			"TEXT_TOO_LONG",
		);
	}

	// Remove shell metacharacters and control characters
	// Allow Japanese characters, alphanumeric, and common punctuation
	return (
		text
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Intentionally removing control characters for security
			.replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
			.replace(/[`$();<>|&\\]/g, "") // Remove shell metacharacters
			.replace(/\s+/g, " ") // Normalize whitespace
			.trim()
	);
}

// Narrator validation is now handled by narrator-cache.ts

/**
 * Sanitizes emotion key to prevent injection
 */
export function sanitizeEmotionKey(key: string): string {
	// Only allow alphanumeric and underscore
	const sanitized = key.replace(/[^a-zA-Z0-9_]/g, "");
	if (!sanitized) {
		throw new ValidationError(
			`Invalid emotion key: ${key}`,
			"INVALID_EMOTION_KEY",
		);
	}
	return sanitized;
}

/**
 * Validates and sanitizes emotion parameters
 */
export function validateEmotionParams(
	emotion: Record<string, number> | undefined,
): Record<string, number> | undefined {
	if (!emotion) return undefined;

	const validated: Record<string, number> = {};
	for (const [key, value] of Object.entries(emotion)) {
		const safeKey = sanitizeEmotionKey(key);
		const safeValue = Math.max(
			CONFIG.VOICEPEAK.EMOTION.MIN,
			Math.min(CONFIG.VOICEPEAK.EMOTION.MAX, Number(value) || 0),
		);
		validated[safeKey] = safeValue;
	}
	return validated;
}

/**
 * Validates speed parameter
 */
export function validateSpeed(speed: number | undefined): number {
	if (speed === undefined) return CONFIG.VOICEPEAK.SPEED.DEFAULT;
	return Math.max(
		CONFIG.VOICEPEAK.SPEED.MIN,
		Math.min(
			CONFIG.VOICEPEAK.SPEED.MAX,
			Number(speed) || CONFIG.VOICEPEAK.SPEED.DEFAULT,
		),
	);
}

/**
 * Validates pitch parameter
 */
export function validatePitch(pitch: number | undefined): number {
	if (pitch === undefined) return CONFIG.VOICEPEAK.PITCH.DEFAULT;
	return Math.max(
		CONFIG.VOICEPEAK.PITCH.MIN,
		Math.min(
			CONFIG.VOICEPEAK.PITCH.MAX,
			Number(pitch) || CONFIG.VOICEPEAK.PITCH.DEFAULT,
		),
	);
}

/**
 * Validates audio file path and prevents path traversal attacks
 */
export async function validateAudioFilePath(filePath: string): Promise<string> {
	if (!filePath || typeof filePath !== "string") {
		throw new ValidationError("File path is required", "INVALID_FILE_PATH");
	}

	// Resolve to absolute path
	const absolutePath = path.resolve(filePath);

	// Check if path is within allowed directories (tmp directory)
	const allowedDir = path.resolve(tmpdir());
	if (!absolutePath.startsWith(allowedDir)) {
		// Also allow user-specified paths in their home directory
		const homeDir = process.env.HOME || process.env.USERPROFILE;
		if (!homeDir || !absolutePath.startsWith(path.resolve(homeDir))) {
			throw new ValidationError(
				"File path is outside allowed directories",
				"PATH_TRAVERSAL_ATTEMPT",
			);
		}
	}

	// Check file exists and is a regular file
	try {
		const stats = await fs.stat(absolutePath);
		if (!stats.isFile()) {
			throw new ValidationError("Path is not a file", "NOT_A_FILE");
		}
		if (stats.size > CONFIG.AUDIO.MAX_FILE_SIZE) {
			throw new ValidationError(
				`File is too large (max ${CONFIG.AUDIO.MAX_FILE_SIZE} bytes)`,
				"FILE_TOO_LARGE",
			);
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new ValidationError("File not found", "FILE_NOT_FOUND");
		}
		throw error;
	}

	// Validate file extension
	const ext = path.extname(absolutePath).toLowerCase();
	if (!CONFIG.AUDIO.ALLOWED_EXTENSIONS.includes(ext as ".wav" | ".WAV")) {
		throw new ValidationError(
			`Invalid file type. Allowed: ${CONFIG.AUDIO.ALLOWED_EXTENSIONS.join(", ")}`,
			"INVALID_FILE_TYPE",
		);
	}

	// Validate WAV file format (check magic number)
	try {
		const buffer = Buffer.alloc(12);
		const fd = await fs.open(absolutePath, "r");
		await fd.read(buffer, 0, 12, 0);
		await fd.close();

		const riff = buffer.toString("ascii", 0, 4);
		const wave = buffer.toString("ascii", 8, 12);

		if (riff !== "RIFF" || wave !== "WAVE") {
			throw new ValidationError(
				"File is not a valid WAV file",
				"INVALID_WAV_FORMAT",
			);
		}
	} catch (error) {
		if (error instanceof ValidationError) throw error;
		throw new ValidationError(
			"Failed to validate audio file format",
			"FILE_VALIDATION_FAILED",
			error,
		);
	}

	return absolutePath;
}

/**
 * Validates output file path
 */
export function validateOutputPath(
	outputPath: string | undefined,
): string | undefined {
	if (!outputPath) return undefined;

	// Ensure path is absolute and within temp directory
	const absolutePath = path.resolve(outputPath);
	const tempDir = path.resolve(tmpdir());

	// Force output to temp directory if specified path is outside
	if (!absolutePath.startsWith(tempDir)) {
		const filename = path.basename(outputPath);
		// Sanitize filename
		const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "");
		return path.join(tempDir, safeName);
	}

	return absolutePath;
}
