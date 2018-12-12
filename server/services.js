const request = require('request')
const db = require('./db')
const dns = require('dns')
const logger = require('./logger').logger
const helpers = require('./helpers');

const getApiHost = (claveCliente) => {
    if (helpers.isEnv('production')) {
        return `https://${claveCliente}.admintotal.com`
    }

    return `http://${claveCliente}.local:8000`
}

const getURL = (path, claveCliente) => {
    let apiHost = getApiHost(claveCliente)
    return `${apiHost}/api-desktop/v1${path}`
}

let nsLookup = function(domain, timeout, callback) {
    let callbackCalled = false;
    let doCallback = (err, domains) => {
        if (callbackCalled) return
        callbackCalled = true
        callback(err, domains)
    }

    setTimeout(() => {
        doCallback(new Error("Timeout exceeded"), null)
    }, timeout)

    dns.lookup(domain, doCallback)
}


exports.checkConnection = (opts = {}) => {
    return new Promise((resolve, reject) => {
        if (!helpers.isEnv('production')) {
            return resolve(true)
        }

        return nsLookup('google.com', opts.timeout || 5000, (err, addresses) => {
            if (err) {
                if (opts.returnBool) {
                    return resolve(false)
                }
                
                return reject(err)
            }
            
            return resolve(true)
        })
    }) 
}

exports.post = (options, onResult) => {
    exports.checkConnection()
    .then(() => {
        let uri =  getURL(options.path, options.claveCliente);
        let params = {
            url: uri,
            body: JSON.stringify(options.data),
            headers: {
                'Content-Type': 'application/json',
                'App-Version': process.env.APP_VERSION
            }
        }

        if (options.timeout) {
            params.timeout = options.timeout
        }
        
        try {
            return request.post(params, function(err, httpResponse, body) {
                if (err) {
                    return onResult(err, {})
                }

                try{
                    body = Object.keys(err || {}).length > 0 ? body : JSON.parse(body);
                    return onResult(null, body)
                } catch(e) {
                    return onResult({
                        code: 'INVALID_JSON_RESPONSE', 
                        message: e,
                        data: params
                    }, body)
                }
            })
        } catch(err) {
            logger.log('error', err)
            return onResult({code: 'INVALID_JSON_RESPONSE'})
        }
    })
    .catch((err) => {
        logger.log('error', err)
        return onResult({code: 'CONN_OFFLINE'})
    })
}

exports.get = (options, onResult) => {
    exports.checkConnection()
    .then(async () => {
        if (! options.data ) {
            throw new Error("Data no especificado")
        }

        if (! options.data.api_key ) {
            throw new Error("data.api_key no especificado")
        }

        let doc = await db._api.findOne({api_key: options.data.api_key});

        if (!doc) {
            return onResult({status: 'error', message: 'api_key inválido.'}, {});
        }

        let uri = getURL(options.path, doc.claveCliente);
        let data = options.data;
        let params = { 
            url: uri, 
            qs: data,
            headers: {
                'App-Version': process.env.APP_VERSION
            }
        }

        if (options.timeout) {
            params.timeout = options.timeout
        }

        try {
            return request.get(params, function(err, httpResponse, body) {
                if (err) {
                    return onResult(err, {})
                }
                
                try{
                    return onResult(err, JSON.parse(body || {}), doc.claveCliente)
                } catch(e) {
                    return onResult({
                        code: 'INVALID_JSON_RESPONSE', 
                        message: e,
                        data: params
                    }, body)
                }
            })
        } catch( err ) {
            logger.log('error', err)
            return onResult({code: 'CONN_OFFLINE'})
        }
    })
    .catch((err) => {
        logger.log('error', err)
        return onResult({code: 'CONN_OFFLINE'})
    })    
    
}

exports.errorResponse = (err) => {
    let errorMessage = 'Hubo un error al comunicarse con el servidor.'

    if (err.code === 'ENOTFOUND') {
        return {
            status: 'error', 
            code: err.code,
            message: 'El cliente especificado no existe'
        }
    }

    /* El servidor local no esta corriendo */
    if (err.code === 'ECONNREFUSED') {
        return {
            status: 'error', 
            code: err.code,
            message: `No se pudo establecer conexión con el servidor: ${err.address}:${err.port}`
        }
    }

    if (err.code === 'INVALID_JSON_RESPONSE') {
        return {
            status: 'error', 
            code: err.code,
            message: `La respuesta del servidor no pudo ser procesada`
        }
    }

    if (err.code === 'CONN_OFFLINE') {
        return {
            status: 'error', 
            code: err.code,
            message: `Es necesaria la conexión a internet para realizar esta acción.`
        }
    }

    if (err.code === 'PLAIN') {
        return {
            status: 'error', 
            code: err.code,
            message: JSON.stringify(err)
        }
    }

    return {status: 'error', message: errorMessage, code: err.code}
}

exports._post = (options) => {
    return new Promise((resolve, reject) => {
        try {
            exports.post(options, (err, result) => {
                if (err) {
                    logger.log('error', {error: err, body: options, result: result})
                    return reject(exports.errorResponse(err))
                }

                return resolve(result)
            })
        } catch(e) {
            logger.log('error', {error: e, body: options})
            return reject(exports.errorResponse(e))
            
        }
    })
}

exports._get = (options) => {
    return new Promise((resolve, reject) => {
        try {
            exports.get(options, (err, result) => {
                if (err) {
                    logger.log('error', {error: err, params: options, result: result})
                    return reject(exports.errorResponse(err))
                }
                
                return resolve(result)
            })
        } catch(e) {
            logger.log('error', {error: e, params: options})
            return reject(exports.errorResponse(err.code))
        }
    })
}

exports.getApiHost = getApiHost