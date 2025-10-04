import { processManager } from "./process-manager.js";
import { CONFIG } from "./types.js";

/**
 * Cache for available narrators with automatic refresh
 */
export class NarratorCache {
	private narrators: Set<string> | null = null;
	private lastFetch: number = 0;
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
	private fetchPromise: Promise<Set<string>> | null = null;

	/**
	 * Get the list of available narrators (cached)
	 */
	async getAvailableNarrators(): Promise<Set<string>> {
		const now = Date.now();

		// Return cached value if still valid
		if (this.narrators && now - this.lastFetch < this.CACHE_TTL) {
			return this.narrators;
		}

		// If already fetching, wait for that promise
		if (this.fetchPromise) {
			return this.fetchPromise;
		}

		// Fetch new narrator list
		this.fetchPromise = this.fetchNarrators();

		try {
			this.narrators = await this.fetchPromise;
			this.lastFetch = now;
			return this.narrators;
		} finally {
			this.fetchPromise = null;
		}
	}

	/**
	 * Force refresh the narrator cache
	 */
	async refresh(): Promise<void> {
		this.narrators = null;
		this.lastFetch = 0;
		await this.getAvailableNarrators();
	}

	/**
	 * Check if a narrator is valid
	 */
	async isValidNarrator(narrator: string | undefined): Promise<boolean> {
		if (!narrator) return true; // Optional field
		const availableNarrators = await this.getAvailableNarrators();
		return availableNarrators.has(narrator);
	}

	/**
	 * Fetch narrators from VOICEPEAK CLI
	 */
	private async fetchNarrators(): Promise<Set<string>> {
		try {
			const output = await processManager.spawn(CONFIG.VOICEPEAK.PATH, [
				"--list-narrator",
			]);

			const narrators = output
				.split("\n")
				.filter((line) => line.trim() && !line.includes("[debug]"))
				.map((line) => line.trim())
				.filter((line) => line.length > 0);

			return new Set(narrators);
		} catch (error) {
			console.error("[VoicePeak MCP] Failed to fetch narrators:", error);
			// Return empty set on error - will retry on next request
			return new Set();
		}
	}

	/**
	 * Clear the cache
	 */
	clear(): void {
		this.narrators = null;
		this.lastFetch = 0;
		this.fetchPromise = null;
	}
}

// Singleton instance
export const narratorCache = new NarratorCache();
