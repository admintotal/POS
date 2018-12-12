const api = require('../services')
const moment = require('moment')
const db = require('../db')
const logger = require('../logger').logger
const helpers = require('../helpers')
const {enviarRecepcionesPago, habilitarSinc} = require('./sincronizar')
const uniqid = require('uniqid')

exports.recepcionesPago = async (req, res) => {
    let dbCliente = await db._getDB(req.query.api_key)
    let page = req.query.page
    let limit = req.query.perPage
    let filtroObj = {}

    if (req.query.desde) {
        if (!filtroObj.fecha) {
            filtroObj.fecha = {}
        }

        filtroObj.fecha['$gte'] = req.query.desde
    }

    if (req.query.hasta) {
        if (!filtroObj.fecha) {
            filtroObj.fecha = {}
        }

        filtroObj.fecha['$lte'] = req.query.hasta
    }
    
    let q = req.query.q

    if (q) {
            filtroObj['$or'] = [
                {'cliente.razon_social': {$regex: new RegExp(q, 'i')}},
                {'cliente.rfc': {$regex: new RegExp(q, 'i')}},
                {'cliente.nombre_comercial': {$regex: new RegExp(q, 'i')}},
                {'cliente.codigo': {$regex: new RegExp(q, 'i')}},
                {'referencia': {$regex: new RegExp(q, 'i')}},
            ]
    }

    let elemPorPag = +(req.query.elemPorPag || 50)
    let requestedUrl = req.protocol + '://' + req.get('Host') + '/api' + req.path
    let paginaActual = +req.query.pagina
    let paginador = await helpers.paginador(dbCliente.recepciones_pago, {
        filtroObj: filtroObj,
        elemPorPag: elemPorPag,
        paginaActual: paginaActual,
        requestedUrl: requestedUrl,
        sort: {fecha: -1},
        qs: helpers.cloneObject(req.query)
    })

    return res.json({
        status: 'success',
        objects: paginador.objects,
        paginador: paginador
    })
}

exports.sincronizarPago = async (req, res) => {
    try {
        let dbCliente = await db._getDB(req.query.api_key)
        let p = await dbCliente.recepciones_pago.findOne({_id: req.params.id})
        let statusSync = await enviarRecepcionesPago(req.query.api_key, dbCliente, [p])

        if (!statusSync.guardados || !Object.keys(statusSync.guardados).length) {
            let err = 'Hubo un problema al sincronizar el pago.'

            if (statusSync.errores && (p._id in statusSync.errores)) {
                err = statusSync.errores[p._id]
                logger.log('error', statusSync.errores)
            }
            
            return res.json({
                status: 'error',
                message: err
            })
        }
        
        return res.json({
            status: 'success',
            message: 'Sincronizado correctamente.'
        })
    } catch(e) {
        return res.json({
            status: 'error',
            message: e
        })
    }
}

exports.guardarPago = (req, res) => {
    return db._getDB(req.query.api_key).then(async (dbCliente) => {
        let pago = req.body
        let conf = await dbCliente.conf.findOne({})
        let imprimir = conf.impresora ? true : false
        let usuario = await dbCliente.usuarios.findOne({api_token: req.query.api_key})
        let docTrans

        if(!pago._id || pago._id !== ""){
            delete pago._id
            pago.fecha = moment().toISOString()
            pago.creado = moment().toISOString()
            pago.sincronizado = false
            pago.uuid = `RP-${conf.numero_serie}-${(new Date()).getTime()}`
            pago.referencia = pago.uuid
            pago.usuario = {
                id: usuario.id,
                username: usuario.username
            }
            pago.cajero = pago.usuario
            pago.almacen = conf.almacen

            if (!Array.isArray(pago.tarjeta.cobros)) {
                pago.tarjeta.cobros = []
            }
            
            if (pago.tipo_pago[0] == 4) {

                let servicioCobro = null
            
                // prosepago
                if (conf.habilitarProsepago && !conf.habilitarPinpad) {
                    servicioCobro = 'prosepago'
                }
                
                // pinpad banco
                if (conf.habilitarPinpad && !conf.habilitarProsepago) {
                    servicioCobro = conf.pinpad.banco
                }

                // seleccionado por el vendedor
                if (conf.habilitarProsepago && conf.habilitarPinpad) {
                    servicioCobro = pago.pinpadSeleccionado
                }


                if (servicioCobro) {
                    switch(servicioCobro) {
                        case conf.pinpad.banco:
                            logger.log('info', `Iniciando el cobro con pinpad`)
                            try{
                                let con = await helpers.validarConexionInternet()
                                if (!con) {
                                    return res.json({
                                        status: 'error',
                                        message: 'Es necesaria la conexión a internet para continuar.'
                                    })
                                }

                                let statusCobro = await helpers.cobrarPagoPinpad(pago, conf)
                                try {
                                    docTrans = await dbCliente.transacciones_pp.insert({
                                        tipoTransaccion: 'recepcion_pago',
                                        fecha: moment().toISOString(),
                                        resultado: statusCobro.cobroPinpad,
                                        referencia: statusCobro.cobroPinpad.datos.referencia,
                                        usuario: {
                                            id: usuario.id,
                                            username: usuario.username,
                                        }
                                    })

                                    pago.tarjeta.transaccion_id = docTrans._id

                                } catch(e) {
                                    logger.log('error', e)
                                }

                                if (statusCobro.status !== 'success') {
                                    statusCobro.transaccion = docTrans
                                    return res.json(statusCobro)
                                }


                                if (pago.cobroTarjeta.status !== 'success') {
                                    return res.json({
                                        status: 'error',
                                        message: pago.cobroTarjeta.mensaje,
                                        cobrosPinpad: pago.cobrosPinpad
                                    })
                                }
                            } catch(e) {
                                logger.log('error', e.message || 'Error al realizar el cobro')

                                return res.json({
                                    status: 'error',
                                    message: e.message || 'Error al realizar el cobro'
                                })
                            }

                            break

                        case 'prosepago':
                            return res.json({
                                status: 'error',
                                message: 'La integración de prosepago para este módulo no esta disponible.'
                            })
                            break
                    }
                }
                
            }
            
            if (('tipos_pago_tarjeta' in pago) && pago.tarjeta.tipo_tarjeta) {
                pago.tipo_pago = pago.tipos_pago_tarjeta[pago.tarjeta.tipo_tarjeta]
                delete pago.tipos_pago_tarjeta
            }

            let p = await dbCliente.recepciones_pago.insert(pago)

            if (pago.cobroTarjeta) {
                cobroId = uniqid()

                pago.tarjeta.cobros.push({
                    _id: cobroId,
                    status: 'success',
                    datos: pago.tarjeta.datos,
                    integracion: pago.tarjeta.integracion,
                    importe: pago.tarjeta.monto,
                    transaccion_id: pago.tarjeta.transaccion_id,
                    creado: moment().toISOString()
                })

                let montoTarjetaCobrado = 0
                pago.tarjeta.cobros.map(cobro => {
                    montoTarjetaCobrado += cobro.importe
                })

                delete pago.tarjeta.integracion
                delete pago.tarjeta.no_tarjeta
                delete pago.tarjeta.tipo_tarjeta
                delete pago.tarjeta.datos
                
                pago.sincHabilitada = false
                pago.tarjeta.monto = montoTarjetaCobrado


                await dbCliente.recepciones_pago.update({referencia: p.referencia}, {$set: Object.assign(pago)}, {upsert: true})
                pago = await dbCliente.recepciones_pago.findOne({referencia: p.referencia})
           }

            // sincronizacion de la recepcion de pago
            try {
                let statusSync = await enviarRecepcionesPago(req.query.api_key, dbCliente, [p])
                let mensaje = 'Los datos han sido guardados correctamente'

                if (statusSync.no_timbrados.indexOf(p._id) !== -1) {
                    mensaje = 'El pago ha sido sincronizado pero hubo problemas al timbrar el movimiento.'
                } else {
                    console.log(statusSync.no_timbrados.indexOf(p._id))
                }
            
                return res.json({
                    status: 'success',
                    imprimir: imprimir,
                    impresora: conf.impresora,
                    message: mensaje,
                    pago: p
                })
            } catch(e) {
                logger.log('error', e)
                return res.json({
                    status: 'error',
                    message: e.message,
                    pago: p
                })
            }
        }

        return res.json({
            status: 'success',
            imprimir: imprimir,
            impresora: conf.impresora,
            message: 'Los datos han sido guardados correctamente'
        })
    })
}

exports.obtenerDatosForm = (req, res) => {
    return db._getDB(req.query.api_key).then(async (dbCliente) => {
    	let apiData = {api_key: req.query.api_key, cliente: req.query.cliente, almacen: req.query.almacen}
        opts = {path: '/pagos/datos-form', data: apiData, claveCliente: dbCliente.claveCliente}
        try {
	        let apicall = await api._get(opts)
            apicall.almacenes = await dbCliente.almacenes.find({})
	    	return res.json(apicall)
        } catch(err) {
	    	return res.json({
	    		status: 'error',
	    		message: err.message || ''
	    	})
        }
    })
}