#!/usr/bin/env bun

// Script to set up VOICEPEAK dictionary with common programming terms
import {
	COMMON_PROGRAMMING_TERMS,
	dictionaryManager,
} from "../src/dictionary.js";

async function main() {
	console.log(
		"Setting up VOICEPEAK dictionary with common programming terms...",
	);

	try {
		// Get existing entries
		const existing = await dictionaryManager.readDictionary();
		const existingTerms = new Set(existing.map((e) => e.sur));
		console.log(`Found ${existing.length} existing entries`);

		// Add only new terms
		let addedCount = 0;
		let skippedCount = 0;

		for (const term of COMMON_PROGRAMMING_TERMS) {
			if (!existingTerms.has(term.sur)) {
				await dictionaryManager.addEntry(term);
				console.log(`Added: ${term.sur} → ${term.pron}`);
				addedCount++;
			} else {
				skippedCount++;
			}
		}

		console.log(`\n✅ Setup complete!`);
		console.log(`   Added: ${addedCount} new terms`);
		console.log(`   Skipped: ${skippedCount} existing terms`);
		console.log(
			`   Total: ${existing.length + addedCount} entries in dictionary`,
		);

		console.log(`\nDictionary location: ${dictionaryManager.getPath()}`);
	} catch (error) {
		console.error("❌ Error setting up dictionary:", error);
		process.exit(1);
	}
}

main();
