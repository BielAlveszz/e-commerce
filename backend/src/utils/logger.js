const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        // Guarda apenas os erros neste ficheiro
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../../logs/error.log'), 
            level: 'error' 
        }),
        // Guarda todos os logs (info, warn, error) neste ficheiro
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../../logs/combined.log') 
        }),
    ],
});

// Se não estiver em produção, também imprime na consola de forma legível
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, stack }) => {
                return `[${timestamp}] ${level}: ${stack || message}`;
            })
        )
    }));
}

module.exports = logger;