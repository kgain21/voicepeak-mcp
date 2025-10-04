import { VoicepeakError } from "./errors.js";

interface QueueItem {
	execute: () => Promise<string>;
	resolve: (value: string) => void;
	reject: (reason: any) => void;
}

export class SynthesisQueue {
	private queue: QueueItem[] = [];
	private isProcessing = false;

	/**
	 * Add a synthesis request to the queue
	 * The execute function should handle its own retry logic
	 */
	async addToQueue(execute: () => Promise<string>): Promise<string> {
		return new Promise((resolve, reject) => {
			this.queue.push({
				execute,
				resolve,
				reject,
			});
			this.processQueue();
		});
	}

	/**
	 * Process the queue sequentially
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;

		while (this.queue.length > 0) {
			const item = this.queue.shift();
			if (!item) continue;

			await this.processSingleItem(item);
		}

		this.isProcessing = false;
	}

	/**
	 * Process a single queue item
	 */
	private async processSingleItem(item: QueueItem): Promise<void> {
		const { execute, resolve, reject } = item;

		try {
			const result = await execute();
			resolve(result);
		} catch (error) {
			reject(error);
		}
	}

	/**
	 * Get queue status
	 */
	getStatus(): { queueLength: number; isProcessing: boolean } {
		return {
			queueLength: this.queue.length,
			isProcessing: this.isProcessing,
		};
	}

	/**
	 * Clear the queue
	 */
	clear(): void {
		// Reject all pending items
		for (const item of this.queue) {
			item.reject(
				new VoicepeakError("Queue cleared", "QUEUE_CLEARED"),
			);
		}
		this.queue = [];
	}
}

// Singleton instance
export const synthesisQueue = new SynthesisQueue();