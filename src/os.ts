// OS-specific configurations and utilities
import * as os from "node:os";
import * as path from "node:path";
import { VoicepeakError, ErrorCode } from "./errors.js";

type Platform = "darwin" | "win32" | "linux";

interface PlatformConfig {
	voicepeakPath: string;
	playCommand: string;
	playArgs: (filePath: string) => string[];
	dictionaryPath: string;
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig | null> = {
	darwin: {
		voicepeakPath: "/Applications/voicepeak.app/Contents/MacOS/voicepeak",
		playCommand: "afplay",
		playArgs: (filePath) => [filePath],
		dictionaryPath: path.join(
			os.homedir(),
			"Library/Application Support/Dreamtonics/Voicepeak/settings/dic.json",
		),
	},
	win32: null, // Not yet supported
	linux: null, // Not yet supported
};

function getPlatform(): Platform {
	const platform = process.platform;
	if (platform === "darwin" || platform === "win32" || platform === "linux") {
		return platform;
	}
	throw new VoicepeakError(
		`Unsupported platform: ${platform}`,
		ErrorCode.UNKNOWN_ERROR,
	);
}

export function getPlatformConfig(): PlatformConfig {
	const platform = getPlatform();
	const config = PLATFORM_CONFIGS[platform];

	if (!config) {
		throw new VoicepeakError(
			`Platform ${platform} is not yet supported. Only macOS is currently supported.`,
			ErrorCode.UNKNOWN_ERROR,
		);
	}

	return config;
}

export function getVoicepeakPath(): string {
	return getPlatformConfig().voicepeakPath;
}

export function getPlayCommand(): string {
	return getPlatformConfig().playCommand;
}

export function getPlayArgs(filePath: string): string[] {
	return getPlatformConfig().playArgs(filePath);
}

export function getDictionaryPath(): string {
	return getPlatformConfig().dictionaryPath;
}

// Check if the current platform is supported
export function isPlatformSupported(): boolean {
	try {
		const platform = getPlatform();
		return PLATFORM_CONFIGS[platform] !== null;
	} catch {
		return false;
	}
}