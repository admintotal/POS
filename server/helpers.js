const SerialPort = require('serialport')
const moment = require('moment')
const pjson = require('../package.json')
const cryptoNw = require('crypto')
const integracionesPinpad = require(`./lib/pinpad`).integraciones
const fs = require('fs')

let openedPorts = {};

exports.cantidadLetra = (num, moneda) => {
    num = typeof num !== "string" ? String(num) : num
    moneda = moneda || 'MXN';
    num = num.replace("$","").replace(/,/g,"");
    list = num.split('.');
    int_part = '00000'+list[0];
    len = int_part.length;
    miles_millones = int_part.substring(len-12,len-9);
    millones = int_part.substring(len-9,len-6);
    miles = int_part.substring(len-6,len-3);
    unidades = int_part.substring(len-3, len);
    de_pesos = false;
    text = '';
    
    if (miles_millones == '001') {
        text += ' UN MIL ';
    }

    else if (miles_millones > '001'){
        text += centena(miles_millones) + ' MIL ';
    } 
    
    if (millones == '001' ){
        text += ' UN MILLON '
    }
    else if (millones > '001' || miles_millones > '000'){
        text += centena(millones) + ' MILLONES ';
    }
    
    if (miles == '001') {
        text += ' UN MIL ';
    }
    
    
    else if (miles > '001'){
        text += centena(miles) + ' MIL ';
    } 
    

    if (miles_millones > '000' || millones >= '001'){
        if (miles == '000' && unidades == '000'){ 
            text += centena(unidades) + ' DE PESOS';
            de_pesos = true;
        }
    }
    
    if(de_pesos==false){ 
            text += centena(unidades) + ' PESOS';
    }
    
    if (list.length > 1 )
        dec = list[1];
    else
        dec = '00';
        
    if (dec.length > 2 )
        dec = dec.substring(0,2);
    else if(dec.length == 1)
        dec = dec + '0';
    

    if (moneda.toLowerCase() == 'eur') {
        text += ' '+ dec + '/100 EUR.';
    }else if (moneda.toLowerCase() == 'usd') {
        text += ' '+ dec + '/100 USD.';
    } else {
        text += ' '+ dec + '/100 M.N.';
    }
    
    return text;
}

const unidad = (u) => {
    var text = '';
    if(u == '9')
        text = 'NUEVE';
    else if(u == '8')
        text = 'OCHO';
    else if(u == '7')
        text = 'SIETE';
    else if(u == '6')
        text = 'SEIS';
    else if(u == '5')
        text = 'CINCO';
    else if(u == '4')
        text = 'CUATRO';
    else if(u == '3')
        text = 'TRES';
    else if(u == '2')
        text = 'DOS';
    else if(u == '1')
        text = 'UN';
    return text
}

const decena = (n) =>{
    text = '';
    if(n.length < 2 ){
        text = unidad(n)
    } else {
        d = n[n.length-2]
        u = n[n.length-1]
        
        if(d == '9')
            if(u == '0')
                text = 'NOVENTA'; 
            else
                text = 'NOVENTA Y ' + unidad(u);
        else if(d == '8')
            if(u == '0')
                text = 'OCHENTA';
            else
                text = 'OCHENTA Y ' + unidad(u);
        else if(d == '7')
            if(u == '0')
                text = 'SETENTA'; 
            else
                text = 'SETENTA Y ' + unidad(u);
        else if(d == '6')
            if(u == '0')
                text = 'SESENTA'
            else
                text = 'SESENTA Y  ' + unidad(u)
        else if(d == '5')
            if(u == '0')
                text = 'CINCUENTA'
            else
                text = 'CINCUENTA Y ' + unidad(u)
        else if(d == '4')
            if(u == '0')
                text = 'CUARENTA'
            else
                text = 'CUARENTA Y ' + unidad(u)
        else if(d == '3')
            if(u == '0')
                text = 'TREINTA'
            else
                text = 'TREINTA Y ' + unidad(u)
        else if(d == '2')
            if(u == '0')
                text = 'VEINTE'
            else
                text = 'VEINTI' + unidad(u)
        else if(d == '1')
            if(u == '0')
                text = 'DIEZ'
            else if(u == '1')
                text = 'ONCE'
            else if(u == '2')
                text = 'DOCE'
            else if(u == '3')
                text = 'TRECE'
            else if(u == '4')
                text = 'CATORCE'
            else if(u == '5')
                text = 'QUINCE'
            else
                text = 'DIECI' + unidad(u)
        else
            text = unidad(u)
    }
    return text
}

const centena = (num) => {
    text = '';
    
    if(num.length < 3) 
        text = decena(num);
    else {
        l = num.length;
        c = num[l-3];
        d = num.substring(l-2, l);

        if(c == '9')
            text = 'NOVECIENTOS ' +decena(d)
        else if(c == '8')
            text = 'OCHOCIENTOS ' +decena(d)
        else if(c == '7')
            text = 'SETECIENTOS ' +decena(d)
        else if(c == '6')
            text = 'SEISCIENTOS ' +decena(d)
        else if(c == '5')
            text = 'QUINIENTOS ' +decena(d)
        else if(c == '4')
            text = 'CUATROCIENTOS ' +decena(d)
        else if(c == '3')
            text = 'TRESCIENTOS ' +decena(d)
        else if(c == '2')
            text = 'DOSCIENTOS ' +decena(d)
        else if(c == '1')
            if((d[0] == 0) && (d[1] == 0))
                text = 'CIEN';
            else
                text = 'CIENTO ' +decena(d);
        else
           text = decena(d);
    }
    return text
}

exports.obtenerPesoBascula = (bascula) => {
    
    return new Promise((resolve, reject) => {
        let comName = bascula.comName
        let baudRate = bascula.baudRate
        let messageString = bascula.messageString
        let port = openedPorts[comName]

        if (! comName ) {
            return resolve({
                status: 'error',
                message: 'Báscula no seleccionada.'
            })
        }

        if (! port ) {
            const Readline = SerialPort.parsers.Readline;
            const parser = new Readline()
            
            port = new SerialPort(comName, {
                autoOpen:false, 
                baudRate: +baudRate
            })
            
            port.pipe(parser)
            openedPorts[comName] = port
        }

        if (!port.isOpen) {
            port.open()
        }

        let out = ''

        port.on('data', (data) => {
            let str = data.toString('utf8')
            out += str
            if (out.indexOf(' kg') > -1) { 
                if (port.isOpen) {
                    port.close()
                    delete openedPorts[comName]
                }

                let cantidad = out.trim().split(' kg')[0]
                return resolve({status: 'success', cantidad: +cantidad, str: out.trim()})
            }

        })

        port.once('error', (error) => {
            let errMsg = `Error en puerto ${comName}:\n`
            errMsg += error.toString()
            errMsg = errMsg.replace('Error:', '')

            return resolve({status: 'error', message: errMsg})
        })

        port.write(Buffer.from(messageString, 0))
    })
    
}

exports.datetime = (dt, format='YYYY-MM-DD HH:mm:ss') => {
    dt = dt ? dt : moment()
    return dt.format(format)
}

exports.mostrarNotificacion = (titulo, timeout=3000) => {
    if (process.env.NODE_ENV === 'production' && Notification) {
        let iconPath = `file://${nw.__dirname}\\public\\icon.png`
        let notification = new Notification(titulo, {icon: iconPath})
        notification.onshow = () => {
            // play sound on show
            
            // myAud = document.getElementById("audio1")
            // myAud.play()

            setTimeout(() => { notification.close(); }, timeout)
        }
    }
}

exports.cloneObject = (obj) => {
    return JSON.parse(JSON.stringify(obj))
}

exports.javaVersion = () => {
    return new Promise((resolve, reject) => {
        try {
            let spawn = require('child_process').spawnSync('java', ['-version'])
            let stringOutput = spawn.output.toString()

            let arch = stringOutput.toString().indexOf('64-Bit') > -1 ? 'x64' : 'x86'
            let data = stringOutput.toString().split('\n')[0];
            let version = new RegExp('java version').test(data) ? data.split(' ')[2].replace(/"/g, '') : false;
            
            if (version != false) {
                return resolve({
                    status: 'success',
                    version: version,
                    arch: arch
                });
            } else {
                logger.log('error', stringOutput)
                return reject({
                    status: 'error',
                    message: 'No se ha detectado la instalación de JRE 8'
                })
            }
        } catch(e) {
            logger.log('error', stringOutput)
            return reject({
                status: 'error',
                message: 'No se ha detectado la instalación de JRE 8'
            })
        }
    })
}

exports.isEnv = (env) => {
    return pjson.env === env;
}

exports.getPinpadInstance = (conf) => {
    return new Promise((resolve, reject) => {
        let reloadInstance = false
        const logger = require('./logger').logger
        let banco = conf.banco.toLowerCase();
        integracionesPinpad[banco].logger = logger
        const integracion = integracionesPinpad.obtenerIntegracion(banco)
        if (integracion.recargarInstancia(conf)) {
            reloadInstance = true
            if (('liberarDispositivo' in integracion)) {
                integracion.liberarDispositivo()
            }
        }

        if (!integracion.instanciada || reloadInstance) {
            try {
                let statusInstancia = integracion.obtenerInstancia(conf)
                if (!integracion.instanciada) {
                    throw Error(statusInstancia.mensaje)
                }
            } catch(e) {
                return reject({
                    status: 'error',
                    message: e.message || String(e)
                })
            }
        }

        return resolve(integracion);
    })
}

exports.serializeUri = (obj) => {
    var str = [];

    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    }
    
    return str.join("&");
}

exports.consultarProductoAdmintotal = (params) => {
    return new Promise(async (resolve, reject) => {
        const api = require('./services')
        let conexion = false

        try {
            conexion = await api.checkConnection()
        } catch(e) {
            
        }

        if (conexion) {
            let timeout = 10000
            return api._post({timeout: timeout, path: '/productos/consulta/', data: params, claveCliente: params.claveCliente}).then((result) => {
                resolve(result)
            }).catch((err) => {
                reject(err)
            })
        }
        
        reject({
            status: 'error',
            message: 'Sin conexión a internet.'
        })

    })
}

exports.paginador = async (coleccion, opciones={}) => {
    let totalRegistros = await coleccion.count(opciones.filtroObj)
    let totalPaginas = Math.ceil(totalRegistros / opciones.elemPorPag)
    let skip = opciones.paginaActual * opciones.elemPorPag - opciones.elemPorPag
    let paginas = []

    for (var i = 1; i <= totalPaginas; i++) {
        opciones.qs.pagina = i
        paginas.push(`${opciones.requestedUrl}?${exports.serializeUri(opciones.qs)}`)
    }

    let objects = await coleccion.cfind(opciones.filtroObj, opciones.projection || {}).sort(opciones.sort).skip(skip).limit(opciones.elemPorPag).exec()

    return {
        total: totalRegistros,
        pagina: opciones.paginaActual || 1,
        elemPorPag: opciones.elemPorPag,
        paginas: paginas,
        objects: objects
    }
}

exports.cobrarVentaProsepago = async (venta, conf=null, claveCliente=null, api_key=null) => {
    const api = require('./services')

    return new Promise(async (resolve, reject) => {
        try {
            api_key ? api_key : process.env._AK

            let checkStatus = async (pago_prosepago, cb) => {
                let apiResult = await api._get({
                    path: '/ventas/solicitud-prosepago', 
                    claveCliente: claveCliente,
                    data: {
                        api_key: api_key, 
                        usuario: venta.sesionCaja.cajero.id,
                        pago_prosepago: pago_prosepago,
                        terminal: conf.terminal.id,
                    }, 
                })
                
                if (apiResult.status == "success") {
                    return cb(apiResult)
                }

                if (apiResult.status == 'error') {
                    return reject({
                        status: 'error',
                        message: apiResult.message
                    })
                }

                setTimeout(() => {
                    checkStatus(pago_prosepago, cb)
                }, 3000)
            }
            
            api._post({
                path: '/ventas/solicitud-prosepago/', 
                claveCliente: claveCliente, 
                data: {
                    api_key: api_key, 
                    usuario: venta.sesionCaja.cajero.id,
                    monto: venta.total,
                    terminal: conf.terminal.id,
                }
            }).then(res => {
                if (res.status == 'success') {
                    setTimeout(() => {
                        checkStatus(res.pago_prosepago, resolve)
                    }, 6000)
                } else {
                    reject({
                        status: 'error',
                        message: res.message
                    })
                }
            }).catch(err => {
                reject({
                    status: 'error',
                    message: err.message || 'Ocurrió un error al comunicarse con el servidor.'
                })
            })

            /*let check = await checkStatus()
            if (check.status == 'success') {
                resolve()
            }*/
        } catch(e) {
            reject(e)
        }
    })
}

exports.cobrarPagoPinpad = async (pago, conf=null) => {
    const logger = require('./logger').logger
    try{
        let pinpad = await exports.getPinpadInstance(conf.pinpad)
        let cobroPinpad = pinpad.cobrarPago(pago)
        let infoCobro = pinpad.getInfoCobro(cobroPinpad)

        pago.cobrosPinpad.push(infoCobro)
        let mensaje = ((cobroPinpad.datos && cobroPinpad.datos.mensaje) ? cobroPinpad.datos.mensaje : cobroPinpad.mensaje)
        if (cobroPinpad.status !== 'success') {
            return {
                status: 'error',
                message: cobroPinpad.mensaje,
                cobroPinpad: {
                    status: cobroPinpad.status,
                    mensaje: mensaje,
                    datos: infoCobro.datos,
                    integracion: infoCobro.integracion
                },
                cobrosPinpad: pago.cobrosPinpad
            }
        }

        pago.cobroTarjeta = cobroPinpad
        pago.pinpadSeleccionado = infoCobro.integracion
        pago.tarjeta.integracion = infoCobro.integracion
        pago.tarjeta.datos = infoCobro.datos
        pago.tarjeta.no_tarjeta = infoCobro.datos.no_tarjeta
        pago.tarjeta.tipo_tarjeta = infoCobro.datos.tipo_tarjeta
        pago.tarjeta.referencia = infoCobro.datos.referencia
        
        return {
            status: 'success',
            message: mensaje,
            cobroPinpad: {
                status: cobroPinpad.status,
                mensaje: mensaje,
                datos: infoCobro.datos,
                integracion: infoCobro.integracion
            }
        }

    } catch(e) {
        logger.log(e)
        pago.cobroTarjeta = {
            status: 'error',
            message: e.message || 'Error al realizar el cobro'
        }
        return {
            status: 'error',
            message: e.message || 'Error al realizar el cobro'
        }
    }
}

exports.cobrarVentaPinpad = async (venta, conf) => {
    const logger = require('./logger').logger
    
    try{
        let pinpad = await exports.getPinpadInstance(conf.pinpad)
        let cobroPinpad = pinpad.cobrarVenta(venta)
        let infoCobro = pinpad.getInfoCobro(cobroPinpad)

        venta.cobrosPinpad.push(infoCobro)
        let mensaje = ((cobroPinpad.datos && cobroPinpad.datos.mensaje) ? cobroPinpad.datos.mensaje : cobroPinpad.mensaje)

        // el pinpad no respondió, reiniciamos la instancia.
        // esto solamente ocurrió con santander
        if (cobroPinpad.status == 'error' && !mensaje && cobroPinpad.integracion == 'santander') {
            mensaje = 'No se recibió respuesta por parte de la pinpad.'
            try {
                await pinpad.liberarDispositivo()
                delete process.pinpadInstance
            } catch (e) {
                logger.log('error', e)
            }
        }
        
        if (cobroPinpad.status !== 'success') {
            let errorObj = {
                status: 'error',
                message: mensaje,
                cobroPinpad: {
                    status: cobroPinpad.status,
                    mensaje: mensaje,
                    datos: infoCobro.datos,
                    integracion: infoCobro.integracion
                },
                cobrosPinpad: venta.cobrosPinpad
            }
            logger.log('error', errorObj)
            return errorObj
        }

        venta.cobroTarjeta = cobroPinpad
        venta.pinpadSeleccionado = infoCobro.integracion
        venta.tarjeta.integracion = infoCobro.integracion
        venta.tarjeta.datos = infoCobro.datos
        venta.tarjeta.no_tarjeta = infoCobro.datos.no_tarjeta
        venta.tarjeta.tipo_tarjeta = infoCobro.datos.tipo_tarjeta
        
        return {
            status: 'success',
            message: mensaje,
            cobroPinpad: {
                status: cobroPinpad.status,
                mensaje: mensaje,
                datos: infoCobro.datos,
                integracion: infoCobro.integracion
            }
        }

    } catch(e) {
        logger.log('error', e)
        venta.cobroTarjeta = {
            status: 'error',
            message: e.message || 'Error al realizar el cobro'
        }
        return {
            status: 'error',
            message: e.message || 'Error al realizar el cobro'
        }
    }
    
}

exports.validarConexionInternet = async () => {
    const api = require('./services')
    try {
        conexion = await api.checkConnection()
        return true
    } catch(e) {
        return false
    }
}

exports.actualizarCliente = async (data={})  => {
    return new Promise((resolve, reject) => {
        let {dbCliente, api_key, clienteId, productos} = data
        const api = require('./services')
        api._get({path: `/clientes/${clienteId}`, data: {api_key: api_key, productos: productos}, timeout: 10000}).then(async (result) => {
            let p = result.productos
            delete result.productos
            await dbCliente.clientes.update({id: clienteId}, {$set: result})
            resolve({cliente: result, productos: productos})
        }).catch(async (err) => {
            reject(err)
        })
    })
}

exports.getFolio = async (dbCliente, conf)  => {
    let folio = conf.folio_inicial || 1
    
    return +folio
    /*
    let ultimaVenta = await dbCliente.ventas.cfind({folio: {$ne: null}, numero_serie: conf.numero_serie}).sort({folio: -1}).limit(1).exec()

    if (ultimaVenta.length) {
        folio = ultimaVenta[0].folio || folio
        folio = Number(folio) + 1
    }

    return Number(folio)
    */
}


const ciphAlgorithm = 'aes-256-ctr';
const ciphKey = '5zrKyrMHAhU7&;2_tq]att}fB3#W[Gq@F)m';
const ciphIV = '1234567890abcdef';

exports.encrypt = (text) => {
    var cipher = cryptoNw.createCipher(ciphAlgorithm, ciphKey, ciphIV)
    var crypted = cipher.update(text,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
}

exports.decrypt = (text) => {
    var decipher = cryptoNw.createDecipher(ciphAlgorithm, ciphKey, ciphIV)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
}

exports.voucherToHtml = (voucherStr, tipo='comercio', impresora={}) => {
    return new Promise((resolve, reject) => {
        try {
            let parseString = require('xml2js').parseString
            voucherStr = `<root>${voucherStr}</root>`
            parseString(voucherStr, (err, result) => {
                var s = result.root[`voucher_${tipo}`][0]
                var out = ''
                s.split('\n').forEach((l, i) => {
                    var p, w, t;
                    var pos = {l: 'left', c: 'center', r: 'right'}
                    var siz = {n: 'normal', s: 'smaller', b: 'larger'}
                    var wei = {b: 'bold', n: 'normal', l: 'light'}

                    if(l.startsWith('@br')) {
                        l = l.replace(/@br/g, '<br />')
                    } else if(l.startsWith('@')){
                        style = l.split(/ /g)[0].split('')
                        p = pos[style[1]]
                        w = wei[style[3]]
                        t = siz[style[2]]
                        
                        cl = `<div style="font-weight: ${w};font-size: ${t};text-align: ${p};">`
                        cl += l.substring(4)
                        cl += '</div>'
                        l = cl
                    }
                    out += l
                })
                
                resolve(`
                    <div style="line-height:1.1;font-family: Verdana, sans-serif;font-size: 11px;max-width: ${impresora.paperWidth || 250}px;padding-left: ${impresora.marginLeft || 0}px;">${out}</div>
                `)
            })

        } catch(e) {
            reject(e)
        }
    })
}

exports.getNumeroTarjeta = (numero) => {
    if (!numero || numero === '') {
        return ''
    }

    return  `${numero}`.substr(`${numero}`.length - 4);
}

exports.cancelarTransaccionAdmintotal = (datos) => {
    return new Promise(async (resolve, reject) => {

        let {referencia, api_key, importe} = datos

        if (!api_key) {
            return {
                status: 'error',
                message: 'Api key no especificado'
            }
        }

        if (!referencia) {
            return {
                status: 'error',
                message: 'La referencia no fué especificada.'
            }
        }

        const api = require('./services')
        let url = '/sincronizar/cancelar-transaccion-pinpad/'
        return api._post({path: url, data: datos, claveCliente: datos.claveCliente})
            .then((result) => {
                resolve(result)
            }).catch((err) => {
                reject(err)
            })
    })
}

exports.getVentasError = async (opts) => {
    let {db, proj} = opts

    let ventas = await db.ventas.find({error: true}, proj || {})
    return ventas
}

exports.respaldarDatos = async (opts) => {
    const logger = require('./logger').logger
    return new Promise(async (resolve, reject) => {
        try {
            let {dirBase, nombreArchivo, coleccion, filtro} = opts
            
            if (!coleccion || !filtro) {
                return false
            }

            let backupDayPath = `${dirBase}/${moment().format('DD-MM-YY')}/`
            let datos = await coleccion.find(filtro)
            let eliminados = 0
                
            // crea el directorio base de backups en caso de no existir
            if (! fs.existsSync(dirBase) ){
                fs.mkdirSync(dirBase)
            }

            // crea el directorio para los respaldos por dia
            if (! fs.existsSync(backupDayPath) ){
                fs.mkdirSync(backupDayPath)
            }
            
            if (datos.length) {
                fs.appendFileSync(`${backupDayPath}/${nombreArchivo}`, JSON.stringify(datos, null, 0) , 'utf-8')
                eliminados = await coleccion.remove(filtro, {multi: true})
            }

            resolve(eliminados)
        } catch(e) {
            reject(e)
        }
    })
}