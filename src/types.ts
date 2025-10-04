export type Narrator = string; // Dynamic narrator type

export type EmotionParams = Record<string, number>;

export interface SynthesizeOptions {
	text: string;
	narrator?: string;
	emotion?: EmotionParams;
	speed?: number;
	pitch?: number;
	outputPath?: string;
}

export interface PlayOptions {
	filePath: string;
}

export interface ListEmotionsOptions {
	narrator: string;
}

export interface SynthesizeResult {
	outputPath: string;
	duration?: number;
	fileSize?: number;
}

export const CONFIG = {
	VOICEPEAK: {
		// PATH is now managed in os.ts for platform-specific configuration
		SPEED: {
			MIN: 50,
			MAX: 200,
			DEFAULT: 100,
		},
		PITCH: {
			MIN: -300,
			MAX: 300,
			DEFAULT: 0,
		},
		EMOTION: {
			MIN: 0,
			MAX: 100,
		},
	},
	PROCESS: {
		TIMEOUT_MS: 30000,
		MAX_CONCURRENT: 5,
	},
	TEMP_FILE: {
		PREFIX: "voicepeak-mcp",
		EXTENSION: ".wav",
	},
	AUDIO: {
		ALLOWED_EXTENSIONS: [".wav", ".WAV"],
		MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
	},
} as const;
