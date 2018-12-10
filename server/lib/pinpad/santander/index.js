const helpers = require(`../../../helpers`);
const moment = require('moment');

module.exports.santander = {
    instanciada: false,
    banco: 'santander',
    liberarDispositivo: () => {
        module.exports.santander.logger.log('info', `[${module.exports.santander.banco}] Liberando dispositivo.`)
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
                    tipoTarjeta: datos.CardType,
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
    
    cobrarPago: (pago) => {
        try {
            let total = pago.importe
            let statusCobro = process.pinpadInstance.RealizarCobro({
                total: `${pago.importe}`, 
                ref: `${pago.uuid}`,
                cajero: pago.usuario.username,
                // confirmación de tarjeta,
                // por lo pronto no esta disponible en pagos
                tarjetaPrecargada: false
            }, true)
            return JSON.parse(statusCobro.Result)
        } catch(e) {
            module.exports.santander.logger.log('error', {status: 'error', 'mensaje': e})
            return {status: 'error', 'mensaje': e};
        }
    },

    cobrarVenta: (venta) => {
        try {
            let total = venta.tarjeta.monto

            let statusCobro = process.pinpadInstance.RealizarCobro({
                total: `${total}`, 
                ref: `${venta.numero_serie}-${venta.folio}-${+ new Date()}`,
                cajero: venta.sesionCaja.cajero.username,
                tarjetaPrecargada: true
            }, true)
            
            return JSON.parse(statusCobro.Result)
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
                    codigoError: cobroPinpad.errCode,
                    referencia: cobroPinpad.getTx_Reference
                }
            }
        }

        [tipo_tarjeta, banco, marca] = ['', '', '']
        if (cobroPinpad.getRspAppidlabel) {
            [tipo_tarjeta, banco, marca] = cobroPinpad.getRspAppidlabel.split('/')
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
            finTransaccion = moment(fecha, 'DD/MM/YYYY HH:mm:ss').toISOString()
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