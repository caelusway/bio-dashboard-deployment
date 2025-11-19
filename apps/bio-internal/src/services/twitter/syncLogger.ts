import type { SyncStats } from './twitterTypes';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

export interface SyncLogEntry {
    service: string;
    level: LogLevel;
    message: string;
    data?: any;
    error?: string;
    timestamp: string;
    sync_stats?: SyncStats;
}

export class SyncLogger {
    private serviceName: string;
    private logLevel: LogLevel;

    constructor(serviceName: string, logLevel: LogLevel = LogLevel.INFO) {
        this.serviceName = serviceName;
        this.logLevel = logLevel;
    }

    /**
     * Log a debug message
     */
    debug(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            this.log(LogLevel.DEBUG, message, data);
        }
    }

    /**
     * Log an info message
     */
    info(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.INFO) {
            this.log(LogLevel.INFO, message, data);
        }
    }

    /**
     * Log a warning message
     */
    warn(message: string, data?: any): void {
        if (this.logLevel <= LogLevel.WARN) {
            this.log(LogLevel.WARN, message, data);
        }
    }

    /**
     * Log an error message
     */
    error(message: string, error?: any): void {
        if (this.logLevel <= LogLevel.ERROR) {
            this.log(LogLevel.ERROR, message, null, error);
        }
    }

    /**
     * Core logging method
     */
    private log(level: LogLevel, message: string, data?: any, error?: any): void {
        const logEntry: SyncLogEntry = {
            service: this.serviceName,
            level,
            message,
            data: data ? JSON.stringify(data) : undefined,
            error: error ? this.formatError(error) : undefined,
            timestamp: new Date().toISOString(),
        };

        // Console output
        this.outputToConsole(logEntry);
    }

    /**
     * Format error for logging
     */
    private formatError(error: any): string {
        if (error instanceof Error) {
            return `${error.name}: ${error.message}\n${error.stack}`;
        }
        return String(error);
    }

    /**
     * Output log to console with formatting
     */
    private outputToConsole(logEntry: SyncLogEntry): void {
        const timestamp = new Date(logEntry.timestamp).toLocaleString();
        const levelText = LogLevel[logEntry.level];
        const prefix = `[${timestamp}] [${this.serviceName}] [${levelText}]`;

        switch (logEntry.level) {
            case LogLevel.DEBUG:
                console.debug(`${prefix} ${logEntry.message}`, logEntry.data ? JSON.parse(logEntry.data) : '');
                break;
            case LogLevel.INFO:
                console.info(`${prefix} ${logEntry.message}`, logEntry.data ? JSON.parse(logEntry.data) : '');
                break;
            case LogLevel.WARN:
                console.warn(`${prefix} ${logEntry.message}`, logEntry.data ? JSON.parse(logEntry.data) : '');
                break;
            case LogLevel.ERROR:
                console.error(`${prefix} ${logEntry.message}`);
                if (logEntry.error) {
                    console.error(logEntry.error);
                }
                if (logEntry.data) {
                    console.error('Additional data:', JSON.parse(logEntry.data));
                }
                break;
        }
    }

    /**
     * Log sync statistics
     */
    async logSyncStats(stats: SyncStats): Promise<void> {
        const logEntry: SyncLogEntry = {
            service: this.serviceName,
            level: LogLevel.INFO,
            message: 'Sync cycle completed',
            data: JSON.stringify({
                summary: {
                    totalTweetsProcessed: stats.totalTweetsProcessed,
                    tweetsUpdated: stats.tweetsUpdated,
                    tweetsAdded: stats.tweetsAdded,
                    apiRequestsUsed: stats.apiRequestsUsed,
                    syncDuration: `${stats.syncDuration}ms`,
                    errorCount: stats.errors.length,
                },
            }),
            timestamp: new Date().toISOString(),
            sync_stats: stats,
        };

        this.outputToConsole(logEntry);
    }
}
