import {createLogger, format, transports} from 'winston';
import {Als} from '../asyncLocalStorage';

const withAls = <Store>(als: Als<Store>) =>
    format.printf(({level, message, timestamp}) => {
        const store = als.readAll();
        const requestId = store ? store.requestId : '';
        return `${timestamp} [${requestId}] ${level}: ${message}`;
    });

export const logger = <Store>(als: Als<Store>) =>
    createLogger({
        transports: [new transports.Console()],
        format: format.combine(format.colorize(), format.timestamp(), withAls(als)),
    });
