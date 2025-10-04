import { spawn } from "node:child_process";
import { ErrorCode, VoicepeakError } from "./errors.js";
import { CONFIG } from "./types.js";

interface ProcessOptions {
	timeout?: number;
	stdin?: string;
}

export class ProcessManager {
	private activeProcesses = new Set<ReturnType<typeof spawn>>();
	private readonly maxConcurrent: number;

	constructor(maxConcurrent = CONFIG.PROCESS.MAX_CONCURRENT) {
		this.maxConcurrent = maxConcurrent;

		// Register cleanup handlers
		process.on("SIGINT", () => this.cleanup());
		process.on("SIGTERM", () => this.cleanup());
		process.on("exit", () => this.cleanup());
	}

	async spawn(
		command: string,
		args: string[],
		options: ProcessOptions = {},
	): Promise<string> {
		if (this.activeProcesses.size >= this.maxConcurrent) {
			throw new VoicepeakError(
				`Too many concurrent processes (max ${this.maxConcurrent})`,
				ErrorCode.TOO_MANY_PROCESSES,
			);
		}

		const timeout = options.timeout || CONFIG.PROCESS.TIMEOUT_MS;
		const proc = spawn(command, args, {
			stdio: ["pipe", "pipe", "pipe"],
		});

		this.activeProcesses.add(proc);

		// Set up timeout
		const timeoutId = setTimeout(() => {
			proc.kill("SIGTERM");
			// Force kill after grace period
			setTimeout(() => {
				if (proc.killed === false) {
					proc.kill("SIGKILL");
				}
			}, 5000);
		}, timeout);

		try {
			return await new Promise<string>((resolve, reject) => {
				let stdout = "";
				let stderr = "";
				let processExited = false;

				// Handle stdout
				proc.stdout?.on("data", (data) => {
					stdout += data.toString();
				});

				// Handle stderr
				proc.stderr?.on("data", (data) => {
					stderr += data.toString();
				});

				// Handle process exit
				proc.on("exit", (code, signal) => {
					processExited = true;
					clearTimeout(timeoutId);

					if (signal === "SIGTERM" || signal === "SIGKILL") {
						reject(
							new VoicepeakError(
								`Process timeout after ${timeout}ms`,
								ErrorCode.PROCESS_TIMEOUT,
							),
						);
					} else if (code !== 0) {
						// Filter out debug messages from stderr
						const cleanStderr = stderr
							.split("\n")
							.filter((line) => !line.includes("[debug]"))
							.join("\n");

						reject(
							new VoicepeakError(
								`Process exited with code ${code}: ${cleanStderr}`,
								ErrorCode.PROCESS_FAILED,
								{ code, stderr: cleanStderr },
							),
						);
					} else {
						resolve(stdout);
					}
				});

				// Handle process error
				proc.on("error", (error) => {
					if (!processExited) {
						clearTimeout(timeoutId);
						reject(
							new VoicepeakError(
								`Failed to spawn process: ${error.message}`,
								ErrorCode.PROCESS_FAILED,
								error,
							),
						);
					}
				});

				// Write stdin if provided
				if (options.stdin) {
					proc.stdin?.write(options.stdin);
					proc.stdin?.end();
				}
			});
		} finally {
			this.activeProcesses.delete(proc);
		}
	}

	async cleanup(): Promise<void> {
		for (const proc of this.activeProcesses) {
			try {
				proc.kill("SIGTERM");
			} catch {
				// Ignore errors during cleanup
			}
		}
		this.activeProcesses.clear();
	}

	get activeCount(): number {
		return this.activeProcesses.size;
	}
}

// Singleton instance
export const processManager = new ProcessManager();
