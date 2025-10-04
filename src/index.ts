import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ErrorCode, handleToolError, VoicepeakError } from "./errors.js";
import { narratorCache } from "./narrator-cache.js";
import { processManager } from "./process-manager.js";
import { synthesisQueue } from "./synthesis-queue.js";
import { tempFileManager } from "./temp-file-manager.js";
import {
	CONFIG,
	type ListEmotionsOptions,
	type PlayOptions,
	type SynthesizeOptions,
} from "./types.js";
import {
	sanitizeText,
	ValidationError,
	validateAudioFilePath,
	validateEmotionParams,
	validateOutputPath,
	validatePitch,
	validateSpeed,
} from "./validators.js";

// VOICEPEAK CLI wrapper with validation
async function runVoicePeak(args: string[]): Promise<string> {
	return processManager.spawn(CONFIG.VOICEPEAK.PATH, args);
}

// Safe audio playback with validation
async function playAudio(filePath: string): Promise<void> {
	const validatedPath = await validateAudioFilePath(filePath);
	await processManager.spawn("afplay", [validatedPath]);
}

// Safe synthesis with all validations and queue/retry logic
async function synthesizeSafe(options: SynthesizeOptions): Promise<string> {
	// Validate all inputs
	const sanitizedText = sanitizeText(options.text);

	if (
		options.narrator &&
		!(await narratorCache.isValidNarrator(options.narrator))
	) {
		throw new ValidationError(
			`Invalid narrator: ${options.narrator}`,
			"INVALID_NARRATOR",
		);
	}

	const validatedEmotion = validateEmotionParams(options.emotion);
	const validatedSpeed = validateSpeed(options.speed);
	const validatedPitch = validatePitch(options.pitch);
	const validatedOutputPath = validateOutputPath(options.outputPath);

	// Create safe output path
	const outputFile = validatedOutputPath || (await tempFileManager.create());

	// Build safe command arguments
	const voicepeakArgs = ["-s", sanitizedText, "-o", outputFile];

	if (options.narrator) {
		voicepeakArgs.push("-n", options.narrator);
	}

	if (validatedEmotion && Object.keys(validatedEmotion).length > 0) {
		const emotionStr = Object.entries(validatedEmotion)
			.map(([key, value]) => `${key}=${value}`)
			.join(",");
		voicepeakArgs.push("-e", emotionStr);
	}

	if (validatedSpeed !== CONFIG.VOICEPEAK.SPEED.DEFAULT) {
		voicepeakArgs.push("--speed", validatedSpeed.toString());
	}

	if (validatedPitch !== CONFIG.VOICEPEAK.PITCH.DEFAULT) {
		voicepeakArgs.push("--pitch", validatedPitch.toString());
	}

	// Execute synthesis through queue with retry logic
	const execute = async (): Promise<string> => {
		const MAX_RETRIES = 5;
		const RETRY_DELAY = 1000; // 1 second

		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				console.log(
					`[VoicePeak MCP] Synthesis attempt ${attempt}/${MAX_RETRIES}`,
				);
				await runVoicePeak(voicepeakArgs);
				// Ensure file was created
				await tempFileManager.ensureExists(outputFile);
				return outputFile;
			} catch (error) {
				console.error(
					`[VoicePeak MCP] Synthesis failed (attempt ${attempt}/${MAX_RETRIES}):`,
					error,
				);

				if (attempt === MAX_RETRIES) {
					throw new VoicepeakError(
						`Failed to synthesize after ${MAX_RETRIES} attempts: ${error}`,
						ErrorCode.SYNTHESIS_FAILED,
					);
				}

				// Wait before retrying
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
			}
		}

		// Should never reach here, but TypeScript needs this
		throw new VoicepeakError(
			"Unexpected error in synthesis retry logic",
			ErrorCode.SYNTHESIS_FAILED,
		);
	};

	// Add to queue for sequential processing
	return synthesisQueue.addToQueue(execute);
}

// Initialize MCP server
const server = new Server(
	{
		name: "voicepeak-mcp",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// Tool definitions with proper types
const tools: Tool[] = [
	{
		name: "synthesize",
		description: "Synthesize speech from text using VOICEPEAK",
		inputSchema: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "Text to synthesize",
				},
				narrator: {
					type: "string",
					description: "Narrator name (e.g., 'Tohoku Zunko', 'Zundamon')",
				},
				emotion: {
					type: "object",
					description: "Emotion parameters (e.g., {happy: 50, sad: 50})",
					additionalProperties: {
						type: "number",
						minimum: 0,
						maximum: 100,
					},
				},
				speed: {
					type: "number",
					description: "Speech speed (50-200)",
					minimum: 50,
					maximum: 200,
					default: 100,
				},
				pitch: {
					type: "number",
					description: "Speech pitch (-300 to 300)",
					minimum: -300,
					maximum: 300,
					default: 0,
				},
				outputPath: {
					type: "string",
					description:
						"Optional output file path. If not specified, a temporary file will be created",
				},
			},
			required: ["text"],
		},
	},
	{
		name: "play",
		description: "Play a synthesized audio file",
		inputSchema: {
			type: "object",
			properties: {
				filePath: {
					type: "string",
					description: "Path to the audio file to play",
				},
			},
			required: ["filePath"],
		},
	},
	{
		name: "synthesize_and_play",
		description: "Synthesize speech from text and immediately play it",
		inputSchema: {
			type: "object",
			properties: {
				text: {
					type: "string",
					description: "Text to synthesize and play",
				},
				narrator: {
					type: "string",
					description: "Narrator name",
				},
				emotion: {
					type: "object",
					description: "Emotion parameters",
					additionalProperties: {
						type: "number",
						minimum: 0,
						maximum: 100,
					},
				},
				speed: {
					type: "number",
					description: "Speech speed (50-200)",
					minimum: 50,
					maximum: 200,
					default: 100,
				},
				pitch: {
					type: "number",
					description: "Speech pitch (-300 to 300)",
					minimum: -300,
					maximum: 300,
					default: 0,
				},
			},
			required: ["text"],
		},
	},
	{
		name: "list_narrators",
		description: "List all available narrators",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
	{
		name: "list_emotions",
		description: "List available emotions for a narrator",
		inputSchema: {
			type: "object",
			properties: {
				narrator: {
					type: "string",
					description: "Narrator name",
				},
			},
			required: ["narrator"],
		},
	},
];

// Register tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: tools,
	};
});

// Handle tool execution with proper error handling
server.setRequestHandler(
	CallToolRequestSchema,
	async (
		request,
	): Promise<{
		content: Array<{ type: "text"; text: string }>;
	}> => {
		const { name, arguments: args } = request.params;

		try {
			switch (name) {
				case "synthesize": {
					const options = args as unknown as SynthesizeOptions;
					const outputFile = await synthesizeSafe(options);

					return {
						content: [
							{
								type: "text",
								text: `Speech synthesized successfully. Output file: ${outputFile}`,
							},
						],
					};
				}

				case "play": {
					const options = args as unknown as PlayOptions;
					await playAudio(options.filePath);

					return {
						content: [
							{
								type: "text",
								text: `Audio played successfully: ${options.filePath}`,
							},
						],
					};
				}

				case "synthesize_and_play": {
					const options = args as unknown as SynthesizeOptions;
					const outputFile = await synthesizeSafe(options);

					try {
						await playAudio(outputFile);
						return {
							content: [
								{
									type: "text",
									text: "Speech synthesized and played successfully",
								},
							],
						};
					} finally {
						// Clean up temp file after playback
						await tempFileManager.cleanup(outputFile);
					}
				}

				case "list_narrators": {
					const output = await runVoicePeak(["--list-narrator"]);
					const narrators = output
						.split("\n")
						.filter((line) => line.trim() && !line.includes("[debug]"))
						.map((line) => line.trim());

					return {
						content: [
							{
								type: "text",
								text: `Available narrators:\n${narrators.join("\n")}`,
							},
						],
					};
				}

				case "list_emotions": {
					const options = args as unknown as ListEmotionsOptions;

					// Validate narrator
					if (!(await narratorCache.isValidNarrator(options.narrator))) {
						throw new ValidationError(
							`Invalid narrator: ${options.narrator}`,
							"INVALID_NARRATOR",
						);
					}

					const output = await runVoicePeak([
						"--list-emotion",
						options.narrator,
					]);
					const emotions = output
						.split("\n")
						.filter((line) => line.trim() && !line.includes("[debug]"))
						.map((line) => line.trim());

					return {
						content: [
							{
								type: "text",
								text: `Available emotions for ${options.narrator}:\n${emotions.join("\n")}`,
							},
						],
					};
				}

				default:
					throw new VoicepeakError(
						`Unknown tool: ${name}`,
						ErrorCode.UNKNOWN_ERROR,
					);
			}
		} catch (error) {
			return handleToolError(error);
		}
	},
);

// Main server startup
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	// No console output in production to avoid stdio interference
}

// Start server with proper error handling
main().catch((error) => {
	console.error("[VoicePeak MCP] Fatal error:", error);
	process.exit(1);
});
