import Pino, { Logger } from 'pino';
import { LoggerOptions } from 'pino';

export abstract class Service {
    protected log: Logger;

    constructor(name?: string) {
        name = name ? name : this.constructor.name;
        const loggerOptions: LoggerOptions = {
            level: process.env.PINO_LOG_LEVEL || 'info',
            name,
            formatters: {
                level: (label) => {
                    return {
                        level: label.toString(),
                    };
                },
            },
        };
        this.log = Pino(loggerOptions);
    }
}
