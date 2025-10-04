import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool,
} from "@modelcontextprotocol/sdk/types.js";

const VOICEPEAK_PATH = "/Applications/voicepeak.app/Contents/MacOS/voicepeak";

// VOICEPEAKコマンドを実行するヘルパー関数
async function runVoicePeak(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const proc = spawn(VOICEPEAK_PATH, args);
		let stdout = "";
		let stderr = "";

		proc.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		proc.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		proc.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(`VoicePeak exited with code ${code}: ${stderr}`));
			} else {
				resolve(stdout);
			}
		});
	});
}

// 音声ファイルを再生する関数
async function playAudio(filePath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn("afplay", [filePath]);

		proc.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(`Failed to play audio: ${code}`));
			} else {
				resolve();
			}
		});
	});
}

// MCPサーバーの初期化
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

// 利用可能なツール定義
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

// ツールリストの取得
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: tools,
	};
});

// ツールの実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	switch (name) {
		case "synthesize": {
			const {
				text,
				narrator,
				emotion,
				speed = 100,
				pitch = 0,
				outputPath,
			} = args as {
				text: string;
				narrator?: string;
				emotion?: Record<string, number>;
				speed?: number;
				pitch?: number;
				outputPath?: string;
			};

			const outputFile =
				outputPath || join(tmpdir(), `voicepeak_${randomUUID()}.wav`);
			const voicepeakArgs = ["-s", text, "-o", outputFile];

			if (narrator) {
				voicepeakArgs.push("-n", narrator);
			}

			if (emotion && Object.keys(emotion).length > 0) {
				const emotionStr = Object.entries(emotion)
					.map(([key, value]) => `${key}=${value}`)
					.join(",");
				voicepeakArgs.push("-e", emotionStr);
			}

			if (speed !== 100) {
				voicepeakArgs.push("--speed", speed.toString());
			}

			if (pitch !== 0) {
				voicepeakArgs.push("--pitch", pitch.toString());
			}

			await runVoicePeak(voicepeakArgs);

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
			const { filePath } = args as { filePath: string };

			// Check if file exists
			await fs.access(filePath);
			await playAudio(filePath);

			return {
				content: [
					{
						type: "text",
						text: `Audio played successfully: ${filePath}`,
					},
				],
			};
		}

		case "synthesize_and_play": {
			const {
				text,
				narrator,
				emotion,
				speed = 100,
				pitch = 0,
			} = args as {
				text: string;
				narrator?: string;
				emotion?: Record<string, number>;
				speed?: number;
				pitch?: number;
			};

			const outputFile = join(tmpdir(), `voicepeak_${randomUUID()}.wav`);
			const voicepeakArgs = ["-s", text, "-o", outputFile];

			if (narrator) {
				voicepeakArgs.push("-n", narrator);
			}

			if (emotion && Object.keys(emotion).length > 0) {
				const emotionStr = Object.entries(emotion)
					.map(([key, value]) => `${key}=${value}`)
					.join(",");
				voicepeakArgs.push("-e", emotionStr);
			}

			if (speed !== 100) {
				voicepeakArgs.push("--speed", speed.toString());
			}

			if (pitch !== 0) {
				voicepeakArgs.push("--pitch", pitch.toString());
			}

			await runVoicePeak(voicepeakArgs);
			await playAudio(outputFile);

			// Clean up temporary file
			await fs.unlink(outputFile).catch(() => {}); // Ignore errors

			return {
				content: [
					{
						type: "text",
						text: `Speech synthesized and played successfully`,
					},
				],
			};
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
			const { narrator } = args as { narrator: string };
			const output = await runVoicePeak(["--list-emotion", narrator]);
			const emotions = output
				.split("\n")
				.filter((line) => line.trim() && !line.includes("[debug]"))
				.map((line) => line.trim());

			return {
				content: [
					{
						type: "text",
						text: `Available emotions for ${narrator}:\n${emotions.join("\n")}`,
					},
				],
			};
		}

		default:
			throw new Error(`Unknown tool: ${name}`);
	}
});

// サーバーの起動
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	// Do not output anything to stderr in production mode
	// console.error logs would interfere with stdio transport
}

main().catch((_error) => {
	// In case of fatal error, exit silently
	process.exit(1);
});
