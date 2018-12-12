const winston = require('winston')
const db = require('./db')
const helpers = require('./helpers')
const fs = require('fs')
const moment = require('moment')
const app = require('./app')
const Raven = require('raven')

let cacheContext = {}
let logDir = db.storagePath('logs')

if (! fs.existsSync(db.storagePath('')) ){
    fs.mkdirSync(db.storagePath(''))
}

if (! fs.existsSync(logDir) ){
    fs.mkdirSync(logDir)
}

const logger = winston.createLogger({
	level: 'info',
	exitOnError: false,
	format: winston.format.combine(
	    winston.format((info, opts) => {
	    	info.message = `[${helpers.datetime()}] - ${info.message}`
	    	return info;
	    })(),

	    winston.format.simple()
	),
	transports: [
		new winston.transports.File({ filename: `${logDir}/error.log`, level: 'error', maxsize: 5242880, maxFiles: 5 }),
		new winston.transports.File({ filename: `${logDir}/admintotal.log`, maxsize: 5242880, maxFiles: 5 })
	]
})


if (! helpers.isEnv('production') ) {
	logger.add(new winston.transports.Console({
		format: winston.format.simple()
	}))
}

logger.on('data', (data) => {

	if (data.level == 'error') {	
		if (! helpers.isEnv('production') ) { 
			console.log(data)
			return
		}

		Raven.mergeContext(Object.assign(Raven.getContext(), {
			tags: {
				tenant: process.env.TENANT,
				usuario: process.env.USER_NAME,
				appVersion: process.env.APP_VERSION,
            	platform: process.platform
			}
		}))
		
		let msgDesc = data.message
		Raven.captureException(msgDesc, {extra: data})
	}
})

exports.logger = logger
