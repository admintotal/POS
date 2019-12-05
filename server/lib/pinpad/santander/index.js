const helpers = require(`../../../helpers`);
const moment = require('moment-timezone');

module.exports.santander = {
    instanciada: false,
    banco: 'santander',
    liberarDispositivo: () => {
        module.exports.santander.logger.log(
            'info', `[${module.exports.santander.banco}] Liberando dispositivo.`
        )
    },

    consultarTransacciones: (params={}) => {
        let {fecha, referencia} = params
        
        if( !fecha ) {
            fecha = moment().format("DD/MM/YYYY")
        }

        referencia = referencia || ""
        let transacciones = process.pinpadInstance.consultarTransacciones(
            {fecha: fecha, referencia: referencia}, 
            true
        )
        let respuestaXML = transacciones.Result
        let respuesta = []
        respuestaXML.split('transacciones\>')[1].split('<transaccion>').forEach(function(nodo, i) {

            if (nodo.indexOf('nb_referencia') !== -1) {
                var objNode = {}
                nodo = nodo.replace(/<\/(\w+)>/g, '|||').split('|||')

                nodo.forEach(function(kv, i) {
                    var value = kv.match(/<(\w+)/i);
                    if (value && value.length === 2) {
                        objNode[value[1]] = kv.replace(/<(\w+)/g, '').replace('>', '').replace('&gt;', '')
                    }
                })

                respuesta.push({
                    usuario: objNode.cd_usrtransaccion,
                    autorizacion: objNode.nu_auth,
                    importe: objNode.nu_importe,
                    referencia: objNode.nb_referencia,
                    numeroControl: objNode.nu_operaion, // error
                    status: objNode.nb_response,
                    fecha: objNode.fh_registro,
                    respuesta: `(${objNode.cd_resp}) ${objNode.nb_resp}`,
                    tarjeta: {
                        tipo: objNode.cc_tp,
                        numero: objNode.cc_num,
                        tarjetahabiente: (objNode.cc_nombre || '').trim(),
                    },
                })
            }

        })

        return respuesta 
    },

    obtenerInstancia: (config) => {
        module.exports.santander.logger.log('info', `[${module.exports.santander.banco}] Obteniendo instancia...`)

        if (! process.__edge ) {
            let err = {
                status: 'error',
                message: 'El módulo edge-js no ha cargado correctamente.'
            }

            module.exports.santander.logger.log('error', err)
            return err
        }

        const getInstanciaEMV = process.__edge.func({
            source: `${process.__dirname}/lib/pinpad/santander/santander.cs`,
            references: [ 
                `${process.__dirname}/lib/pinpad/santander/cpIntegracionEMV.dll`,
                `${process.__dirname}/lib/pinpad/santander/Newtonsoft.Json.dll`,
            ]
        });
        process.pinpadInstance = getInstanciaEMV(null, true);
        process.pinpadInstance.props = config;

        var c = Object.assign({}, config)
        c.usuario = helpers.decrypt(c.usuario)
        c.password = helpers.decrypt(c.password)
        
        let inicializacion = JSON.parse(process.pinpadInstance.Inicializar(c, true).Result);
        if (inicializacion.status !== 'success') {
            module.exports.santander.inicializada = false
            throw Error(inicializacion.mensaje)
        }

        module.exports.santander.logger.log('info', `[${module.exports.santander.banco}] Instancia creada correctamente.`)
        module.exports.santander.instanciada = true
        return inicializacion
    },

    cancelarOperacion: () => {
        let op = process.pinpadInstance.CancelarOperacion({}, true)
        let resultado = JSON.parse(op.Result)
        return resultado
    },

    reimprimirVoucher: (referencia) => {
        if (!referencia || referencia === "") {
            return {
                status: 'error',
                mensaje: 'Referencia no fué especificada.',
            }
        }

        let op = process.pinpadInstance.ReimprimirVoucher({referencia: `${referencia}`}, true)
        let resultado = JSON.parse(op.Result)
        return resultado
    },

    obtenerInfoTarjeta: (total) => {
        try {
            let datosTarjeta = process.pinpadInstance.ObtenerInfoTarjeta({total: `${total}`}, true)
            let datos = JSON.parse(datosTarjeta.Result)

            if (datos.status == "success") {
                return {
                    status: datos.status,
                    tarjetahabiente: (datos.chkCc_Name || '').trim(),
                    tarjeta: datos.chkCc_Number,
                    mesExp: datos.chkCc_ExpMonth,
                    anioExp: datos.chkCc_ExpYear,
                    aid: datos.chkCc_AID,
                    al: datos.chkCc_AIDLabel,
                    tipoTarjeta: datos.chkCc_AIDLabel,
                    moneda: datos.DescripcionMoneda,
                    importe: datos.importe,
                }
            }

            return {
                status: datos.status,
                mensaje: datos.mensaje
            }

        } catch(e) {
            module.exports.santander.logger.log('error', {status: 'error', 'mensaje': e})
            return {status: 'error', 'mensaje': e};
        }
    },
    
    cobrarPago: async (pago) => {
        try {
            let total = pago.importe
            let referencia = `${pago.uuid}`
            let statusCobro = process.pinpadInstance.RealizarCobro({
                total: `${pago.importe}`, 
                ref: referencia,
                cajero: pago.usuario.username,
                // confirmación de tarjeta,
                // por lo pronto no esta disponible en pagos
                tarjetaPrecargada: false
            }, true).Result
            
            statusCobro = JSON.parse(statusCobro)

            // cuando la api de centro de pagos retorna un valor inesperado
            // se realiza la consulta de la referencia para comprobar el status
            // de la transacción.
            if (statusCobro.comprobarTransaccion) {
                module.exports.santander.logger.log(
                    'error', 
                    `Comprobando transacción ${referencia} por el monto de $${total}`
                )
                statusCobro = await module.exports.santander.comprobarTransaccion(
                    referencia, 
                    statusCobro
                )
            }
            
            return statusCobro
        } catch(e) {
            module.exports.santander.logger.log('error', {status: 'error', 'mensaje': e})
            return {status: 'error', 'mensaje': e};
        }
    },

    comprobarTransaccion: async (referencia, statusCobro) => {
        let comprobacion = await module.exports.santander.consultarTransacciones({
            referencia: referencia
        })

        // si no tenemos respuesta de la consulta logeamos el evento
        // y modificamos el mensaje de error para el cajero.
        if (!comprobacion.length) {
            module.exports.santander.logger.log('error', statusCobro)
            module.exports.santander.logger.log(
                'error', 
                `La consulta de la transacción ${referencia} no arrojó respuesta.`
            )
            statusCobro.mensaje = "No fué posible realizar el cargo, intente de nuevo más tarde."
            return statusCobro
        }

        comprobacion = comprobacion[0]
        statusCobro.comprobacion = comprobacion
        
        if (comprobacion.status == "approved") {
            delete statusCobro.mensaje
            statusCobro.status = "success"
            statusCobro.getTx_Amount = comprobacion.importe
            statusCobro.getRspOperationNumber = comprobacion.numeroControl
            statusCobro.getRspAuth = comprobacion.autorizacion
            statusCobro.getRspCdResponse = comprobacion.respuesta
            statusCobro.getTx_Reference = comprobacion.referencia
            statusCobro.getRspDate = comprobacion.fecha
            statusCobro.getRspArqc = ""
            statusCobro.getRspAppid = ""
            statusCobro.getRspAppidlabel = ""
            // consulta de los vouchers
            try {
                statusCobro.getRspVoucher = await module.exports.santander.reimprimirVoucher(
                    comprobacion.numeroControl
                ).getRspVoucher
            } catch(e) {
                statusCobro.getRspVoucher = ""
            }

        } else if(comprobacion.status == "denied") {
            statusCobro.status = "error"
            statusCobro.mensaje = "La operación fue rechazada por su banco emisor."
        } else {
            statusCobro.status = "error"
            statusCobro.mensaje = "Ocurrió un problema al intentar realizar el cobro."
        }

        return statusCobro
    },

    cobrarVenta: async (venta) => {
        try {
            let total = venta.tarjeta.monto
            let referencia = `${venta.numero_serie}-${venta.folio}-${+ new Date()}`
            let statusCobro = process.pinpadInstance.RealizarCobro({
                total: `${total}`, 
                ref: referencia,
                cajero: venta.sesionCaja.cajero.username,
                tarjetaPrecargada: true
            }, true).Result

            statusCobro = JSON.parse(statusCobro)

            // cuando la api de centro de pagos retorna un valor inesperado
            // se realiza la consulta de la referencia para comprobar el status
            // de la transacción.
            if (statusCobro.comprobarTransaccion) {
                module.exports.santander.logger.log(
                    'error', 
                    `Es necesaria la comprobación de la transacción ${referencia} por el monto de $${total}`
                )
                statusCobro = await module.exports.santander.comprobarTransaccion(
                    referencia, 
                    statusCobro
                )
            }
            
            return statusCobro
        } catch(e) {
            module.exports.santander.logger.log('error', {status: 'error', 'mensaje': e})
            return {status: 'error', 'mensaje': e};
        }
    },
    
    getInfoCobro: (cobroPinpad) => {
        if (cobroPinpad.status !== 'success') {
            return {
                cobroTarjeta: cobroPinpad,
                integracion: module.exports.santander.banco,
                status: cobroPinpad.status,
                datos: {
                    numeroControl: cobroPinpad.getRspOperationNumber,
                    autorizacion: cobroPinpad.getRspAuth,
                    importe: cobroPinpad.getTx_Amount,
                    terminal: cobroPinpad.chkPp_Serial,
                    getRspVoucher: cobroPinpad.getRspVoucher,
                    getRspCdResponse: cobroPinpad.getRspCdResponse,
                    aid: cobroPinpad.chkCc_AID,
                    al: cobroPinpad.chkCc_AIDLabel,
                    codigoError: cobroPinpad.errCode,
                    referencia: cobroPinpad.getTx_Reference
                }
            }
        }

        [tipo_tarjeta, banco, marca] = ['', '', '']
        if (cobroPinpad.getRspAppidlabel) {
            [tipo_tarjeta, banco, marca] = cobroPinpad.getRspAppidlabel.split('/')
        }
        // cuando es consulta automática el tipo de tarjeta lo intentamos
        // obtener de chkCc_AIDLabel
        if (!tipo_tarjeta && cobroPinpad.chkCc_AIDLabel) {
            tipo_tarjeta = (cobroPinpad.chkCc_AIDLabel.toLowerCase().indexOf("debito") > -1) ? "debito" : "credito";
        }
        let fecha = null
        let voucher = cobroPinpad.getRspVoucher
        let f = voucher.split('\n').find(e  => {
            return e.indexOf('Fecha:') > -1
        })
        
        if(f) {
            fecha = f.split('Fecha:')[1]
            fecha = fecha.trim()
        }

        let finTransaccion = moment(cobroPinpad.getRspDate, 'DD/MM/YYYY').toISOString()
        if (fecha) {
            finTransaccion = moment.tz(fecha, 'DD/MM/YYYY HH:mm:ss', 'America/Mexico_City')
                .tz('America/Hermosillo')
                .toISOString()
        }

        return {
            cobroTarjeta: cobroPinpad,
            integracion: module.exports.santander.banco,
            status: cobroPinpad.status,
            datos: {
                tipo_tarjeta: tipo_tarjeta.toLowerCase(),
                no_tarjeta: cobroPinpad.chkCc_Number,
                numeroControl: cobroPinpad.getRspOperationNumber,
                noTarjeta: cobroPinpad.chkCc_Number,
                finTransaccion: finTransaccion,
                autorizacion: cobroPinpad.getRspAuth,
                tarjetahabiente: cobroPinpad.chkCc_Name.trim(),
                importe: cobroPinpad.getTx_Amount,
                terminal: cobroPinpad.chkPp_Serial,
                aid: cobroPinpad.chkCc_AID,
                al: cobroPinpad.chkCc_AIDLabel,
                getRspVoucher: cobroPinpad.getRspVoucher,
                referencia: cobroPinpad.getTx_Reference
            }
        }
    },
    recargarInstancia: (conf) => {
        if (!process.pinpadInstance) {
            return true
        }
        
        return !(
            process.pinpadInstance.props.banco == conf.banco &&
            process.pinpadInstance.props.url == conf.url &&
            process.pinpadInstance.props.urlPublicKey == conf.urlPublicKey &&
            process.pinpadInstance.props.usuario == conf.usuario &&
            process.pinpadInstance.props.magtek == conf.magtek &&
            process.pinpadInstance.props.logMIT == conf.logMIT &&
            process.pinpadInstance.props.password == conf.password
        );
    }
}