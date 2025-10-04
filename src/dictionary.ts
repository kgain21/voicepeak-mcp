// Dictionary management for VOICEPEAK pronunciation customization
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ErrorCode, VoicepeakError } from "./errors.js";
import { getDictionaryPath } from "./os.js";

export interface DictionaryEntry {
	sur: string; // Surface form (the text to be replaced)
	pron: string; // Pronunciation (in Japanese kana)
	pos?: string; // Part of speech (default: "Japanese_Futsuu_meishi")
	priority?: number; // Priority (default: 5)
	accentType?: number; // Accent type (default: 0)
	lang?: string; // Language (default: "ja")
}

// Default values for dictionary entries
const DEFAULT_ENTRY: Partial<DictionaryEntry> = {
	pos: "Japanese_Futsuu_meishi",
	priority: 5,
	accentType: 0,
	lang: "ja",
};

export class DictionaryManager {
	private dictionaryPath: string;

	constructor() {
		this.dictionaryPath = getDictionaryPath();
	}

	/**
	 * Read the current dictionary entries
	 */
	async readDictionary(): Promise<DictionaryEntry[]> {
		try {
			// Ensure dictionary directory exists
			const dir = path.dirname(this.dictionaryPath);
			await fs.mkdir(dir, { recursive: true });

			// Check if dictionary file exists
			try {
				const content = await fs.readFile(this.dictionaryPath, "utf-8");
				return JSON.parse(content) as DictionaryEntry[];
			} catch (error) {
				// File doesn't exist, return empty array
				if ((error as NodeJS.ErrnoException).code === "ENOENT") {
					return [];
				}
				throw error;
			}
		} catch (error) {
			throw new VoicepeakError(
				`Failed to read dictionary: ${error}`,
				ErrorCode.FILE_NOT_FOUND,
			);
		}
	}

	/**
	 * Write dictionary entries
	 */
	async writeDictionary(entries: DictionaryEntry[]): Promise<void> {
		try {
			// Ensure dictionary directory exists
			const dir = path.dirname(this.dictionaryPath);
			await fs.mkdir(dir, { recursive: true });

			// Validate and normalize entries
			const normalizedEntries = entries.map((entry) => ({
				...DEFAULT_ENTRY,
				...entry,
			}));

			// Write with pretty formatting
			const content = JSON.stringify(normalizedEntries, null, 2);
			await fs.writeFile(this.dictionaryPath, content, "utf-8");
		} catch (error) {
			throw new VoicepeakError(
				`Failed to write dictionary: ${error}`,
				ErrorCode.FILE_WRITE_ERROR,
			);
		}
	}

	/**
	 * Add a new entry to the dictionary
	 */
	async addEntry(entry: DictionaryEntry): Promise<void> {
		const entries = await this.readDictionary();

		// Check if entry already exists
		const existingIndex = entries.findIndex(
			(e) =>
				e.sur === entry.sur && e.lang === (entry.lang || DEFAULT_ENTRY.lang),
		);

		if (existingIndex >= 0) {
			// Update existing entry
			entries[existingIndex] = {
				...DEFAULT_ENTRY,
				...entry,
			};
		} else {
			// Add new entry
			entries.push({
				...DEFAULT_ENTRY,
				...entry,
			});
		}

		await this.writeDictionary(entries);
	}

	/**
	 * Remove an entry from the dictionary
	 */
	async removeEntry(surface: string, lang = "ja"): Promise<boolean> {
		const entries = await this.readDictionary();
		const filteredEntries = entries.filter(
			(e) => !(e.sur === surface && e.lang === lang),
		);

		if (filteredEntries.length === entries.length) {
			return false; // No entry was removed
		}

		await this.writeDictionary(filteredEntries);
		return true;
	}

	/**
	 * Find entries by surface form
	 */
	async findEntry(surface: string): Promise<DictionaryEntry[]> {
		const entries = await this.readDictionary();
		return entries.filter((e) => e.sur === surface);
	}

	/**
	 * Clear all dictionary entries
	 */
	async clearDictionary(): Promise<void> {
		await this.writeDictionary([]);
	}

	/**
	 * Get the dictionary file path
	 */
	getPath(): string {
		return this.dictionaryPath;
	}
}

// Singleton instance
export const dictionaryManager = new DictionaryManager();

// Common English terms that are often mispronounced
export const COMMON_PROGRAMMING_TERMS: DictionaryEntry[] = [
	{ sur: "API", pron: "エーピーアイ" },
	{ sur: "CLI", pron: "シーエルアイ" },
	{ sur: "GUI", pron: "ジーユーアイ" },
	{ sur: "URL", pron: "ユーアールエル" },
	{ sur: "HTML", pron: "エイチティーエムエル" },
	{ sur: "CSS", pron: "シーエスエス" },
	{ sur: "JavaScript", pron: "ジャバスクリプト" },
	{ sur: "TypeScript", pron: "タイプスクリプト" },
	{ sur: "Python", pron: "パイソン" },
	{ sur: "GitHub", pron: "ギットハブ" },
	{ sur: "Git", pron: "ギット" },
	{ sur: "npm", pron: "エヌピーエム" },
	{ sur: "bun", pron: "バン" },
	{ sur: "node", pron: "ノード" },
	{ sur: "React", pron: "リアクト" },
	{ sur: "Vue", pron: "ビュー" },
	{ sur: "Angular", pron: "アンギュラー" },
	{ sur: "Docker", pron: "ドッカー" },
	{ sur: "Kubernetes", pron: "クバネティス" },
	{ sur: "AWS", pron: "エーダブリューエス" },
	{ sur: "Azure", pron: "アジュール" },
	{ sur: "GCP", pron: "ジーシーピー" },
	{ sur: "OAuth", pron: "オーオース" },
	{ sur: "JWT", pron: "ジェーダブリューティー" },
	{ sur: "JSON", pron: "ジェイソン" },
	{ sur: "XML", pron: "エックスエムエル" },
	{ sur: "YAML", pron: "ヤムル" },
	{ sur: "SQL", pron: "エスキューエル" },
	{ sur: "NoSQL", pron: "ノーエスキューエル" },
	{ sur: "MongoDB", pron: "モンゴデービー" },
	{ sur: "PostgreSQL", pron: "ポストグレスキューエル" },
	{ sur: "MySQL", pron: "マイエスキューエル" },
	{ sur: "Redis", pron: "レディス" },
	{ sur: "GraphQL", pron: "グラフキューエル" },
	{ sur: "REST", pron: "レスト" },
	{ sur: "WebSocket", pron: "ウェブソケット" },
	{ sur: "HTTP", pron: "エイチティーティーピー" },
	{ sur: "HTTPS", pron: "エイチティーティーピーエス" },
	{ sur: "SSH", pron: "エスエスエイチ" },
	{ sur: "SSL", pron: "エスエスエル" },
	{ sur: "TLS", pron: "ティーエルエス" },
	{ sur: "DNS", pron: "ディーエヌエス" },
	{ sur: "CDN", pron: "シーディーエヌ" },
	{ sur: "IDE", pron: "アイディーイー" },
	{ sur: "VS Code", pron: "ブイエスコード" },
	{ sur: "VSCode", pron: "ブイエスコード" },
	{ sur: "IntelliJ", pron: "インテリジェイ" },
	{ sur: "Eclipse", pron: "イクリプス" },
	{ sur: "Vim", pron: "ヴィム" },
	{ sur: "Emacs", pron: "イーマックス" },
	{ sur: "Linux", pron: "リナックス" },
	{ sur: "Ubuntu", pron: "ウブンツ" },
	{ sur: "CentOS", pron: "セントオーエス" },
	{ sur: "macOS", pron: "マックオーエス" },
	{ sur: "Windows", pron: "ウィンドウズ" },
	{ sur: "iOS", pron: "アイオーエス" },
	{ sur: "Android", pron: "アンドロイド" },
	{ sur: "AI", pron: "エーアイ" },
	{ sur: "ML", pron: "エムエル" },
	{ sur: "Claude", pron: "クロード" },
	{ sur: "MCP", pron: "エムシーピー" },
	{ sur: "VOICEPEAK", pron: "ボイスピーク" },
	{ sur: "Rust", pron: "ラスト" },
	{ sur: "Go", pron: "ゴー" },
	{ sur: "Kotlin", pron: "コトリン" },
	{ sur: "Swift", pron: "スウィフト" },
	{ sur: "C++", pron: "シープラスプラス" },
	{ sur: "C#", pron: "シーシャープ" },
	{ sur: "PHP", pron: "ピーエイチピー" },
	{ sur: "Ruby", pron: "ルビー" },
	{ sur: "Rails", pron: "レイルズ" },
	{ sur: "Django", pron: "ジャンゴ" },
	{ sur: "Flask", pron: "フラスク" },
	{ sur: "Spring", pron: "スプリング" },
	{ sur: "Express", pron: "エクスプレス" },
	{ sur: "Next.js", pron: "ネクストジェイエス" },
	{ sur: "Nuxt", pron: "ナクスト" },
	{ sur: "Gatsby", pron: "ギャツビー" },
	{ sur: "Webpack", pron: "ウェブパック" },
	{ sur: "Babel", pron: "バベル" },
	{ sur: "ESLint", pron: "イーエスリント" },
	{ sur: "Prettier", pron: "プリティア" },
	{ sur: "Jest", pron: "ジェスト" },
	{ sur: "Mocha", pron: "モカ" },
	{ sur: "Cypress", pron: "サイプレス" },
	{ sur: "Selenium", pron: "セレニウム" },
	{ sur: "Jenkins", pron: "ジェンキンス" },
	{ sur: "CircleCI", pron: "サークルシーアイ" },
	{ sur: "Travis", pron: "トラヴィス" },
	{ sur: "GitLab", pron: "ギットラブ" },
	{ sur: "Bitbucket", pron: "ビットバケット" },
	{ sur: "Jira", pron: "ジラ" },
	{ sur: "Slack", pron: "スラック" },
	{ sur: "Discord", pron: "ディスコード" },
	{ sur: "Teams", pron: "チームズ" },
	{ sur: "Zoom", pron: "ズーム" },
	{ sur: "Figma", pron: "フィグマ" },
	{ sur: "Sketch", pron: "スケッチ" },
	{ sur: "Adobe", pron: "アドビ" },
	{ sur: "Photoshop", pron: "フォトショップ" },
	{ sur: "Illustrator", pron: "イラストレーター" },
	{ sur: "XD", pron: "エックスディー" },
];
