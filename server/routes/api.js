const api = require('../services')
const moment = require('moment-timezone')
const db = require('../db')
const logger = require('../logger').logger
const uniqid = require('uniqid')
const formatCurrency = require('format-currency')
const SerialPort = require('serialport')
const helpers = require('../helpers')
const enviarVentas = (require('./sincronizar').enviarVentas)
const enviarRetiros = (require('./sincronizar').enviarRetiros)
const enviarPedidos = (require('./sincronizar').enviarPedidos)
const habilitarSinc = (require('./sincronizar').habilitarSinc)
const fs = require('fs');
const cloneObject = (helpers.cloneObject)
const serializeUri = (helpers.serializeUri)
const {NodeVM} = require('vm2');
const request = require('request');

const productoCodigoBarrasCantidad = async (q, almacen, DB) => {
    let prefijo = "200"
    if (q.length == 13 && q.startsWith(prefijo)) {
        let codigo_producto = q.slice(3, 7)
        let cantidad = q.slice(-6, -1)
        let p = await DB.productos.findOne({
            codigo: codigo_producto, 
            almacen: almacen, 
            activo: true
        })
        cantidad = parseFloat(cantidad) / parseFloat(1000)

        if (p && p.venta_cb_cantidad) {
            return {
                status: 'success',
                productoCantidad: true,
                producto: p, 
                cantidad: cantidad
            }
        }
    }

    return {
        status: 'error'
    }
}

exports.clientes = (req, res) => {
    return db._getDB(req.query.api_key).then(async (dbCliente) => {
        let filter = []
        let limit = null
        let q = req.query.q ? req.query.q.trim() : ''
        let query = dbCliente.clientes.cfind({})

        if (q) {
            filter.push({razon_social: {$regex: new RegExp(q, 'i')}})
            filter.push({rfc: {$regex: new RegExp(q, 'i')}})
            filter.push({nombre_comercial: {$regex: new RegExp(q, 'i')}})
            filter.push({codigo: {$regex: new RegExp(q, 'i')}})
            query = dbCliente.clientes.cfind({$or: filter})
        }

        if (req.query.limit) {
            limit = parseInt(req.query.limit);
        }

        if (limit) {
            query = query.limit(limit);
        }

        let docs = await query.exec()
        return res.json({
            objects: docs
        })
    })
    .catch(() => {
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.cliente = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let id = +req.params.id
        let porCodigo = (req.query.porCodigo || '').toLowerCase() == 'true'
        let conf = await dbCliente.conf.findOne({})
        let cliente

        if (porCodigo) {
            cliente = await dbCliente.clientes.findOne({codigo: req.params.id})
            if(!cliente) {
                return res.json({
                    status: 'error',
                    message: 'No existe ningún cliente con el código ' + req.params.id
                })
            }
            id = cliente.id
        } else {
            cliente = await dbCliente.clientes.findOne({id: id})
        }

        // Acciones por producto
        if (req.query.accion) {
            let accion = req.query.accion
            cliente = await dbCliente.clientes.findOne({id: +id})
            
            if (!req.query.usuario_id) {
                return res.json({
                    status: 'error',
                    message: 'Es necesario especificar el id del usuario'
                })
            }

            usuario = await dbCliente.usuarios.findOne({id: +req.query.usuario_id})

            if (!usuario || !usuario.autorizaciones.guardar_configuracion_desktop) {
                return res.json({
                    status: 'error',
                    message: 'No tiene permiso para realizar esta acción'
                })
            }

            if (!cliente) {
                return res.json({
                    status: 'error',
                    statusCode: 404,
                    message: 'El cliente especificado no existe'
                })
            }

            switch(accion) {
                case 'eliminar':
                    await dbCliente.clientes.remove({id: +id})
                    return res.json({
                        status: 'success',
                        message: 'El cliente ha sido eliminado'
                    })
                    break;

                case 'sincronizar':
                    return res.json({
                        status: 'success',
                        message: 'El cliente ha sido sincronizado'
                    })
                    break;

                default:
                    return res.json({
                        status: 'error',
                        message: 'La acción especificada es inválida'
                    })
                    break;
            }
        }

        let validarPrecioUnitario = conf.configuracion.facturacion.validar_precio_unitario
        let productos = null

        if (validarPrecioUnitario || cliente.clasificacion) {
            productos = req.query.productos
        }
        
        let internetDisponible = await helpers.validarConexionInternet()
        let resetProds = async (productos, cliente) => {
            if (typeof productos === 'string') {
                let ps = {}
                let project = {precio_neto: 1, id: 1, precios_clasificaciones: 1}

                productos = productos.split(',').map(p => {
                    return +p
                })
                productos = (await dbCliente.productos.find({id: {$in: productos}})).map(pp => {
                    ps[pp.id] = {precio_unitario: pp.precio_neto}
                    if (cliente.clasificacion) {
                        ps[pp.id] = {
                            precio_unitario: pp.precio_neto
                        }


                        if (cliente.almacen) {
                            if ( pp.precios_clasificaciones[cliente.almacen] && pp.precios_clasificaciones[cliente.almacen][cliente.clasificacion]) {
                                ps[pp.id] = {
                                    precio_unitario: pp.precios_clasificaciones[cliente.almacen][cliente.clasificacion].precio_neto
                                }
                            } 
                        } else {
                            if ( pp.precios_clasificaciones[conf.almacen.id] && pp.precios_clasificaciones[conf.almacen.id][cliente.clasificacion]) {
                                ps[pp.id] = {
                                    precio_unitario: pp.precios_clasificaciones[conf.almacen.id][cliente.clasificacion].precio_neto
                                }
                            } 
                        }

                    }
                })

                return ps
            }
        }

        if (internetDisponible) {
            return helpers.actualizarCliente({dbCliente:dbCliente, clienteId: id, api_key: req.query.api_key, productos:productos})
            .then(async (result) => {
                return res.json({
                    status: 'success',
                    object: result.cliente,
                    productos: result.productos,
                    internetDisponible: internetDisponible
                })
            })
            .catch(async (err) => {
                productos = await resetProds(req.query.productos, cliente)
                return res.json({
                    status: 'error',
                    object: cliente,
                    productos: productos,
                    message: 'Error al consultar el cliente con admintotal.'
                })
            })
        } 

        productos = await resetProds(req.query.productos, cliente)

        return res.json({
            status: 'success',
            object: cliente,
            productos: productos,
            internetDisponible: internetDisponible
        })
        
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.clientes2 = (req, res) => {
    return db._getDB(req.query.api_key).then(async (dbCliente) => {
        let page = req.query.page
        let limit = req.query.perPage
        let conf = await dbCliente.conf.findOne({})
        let filtroObj = {}
        let q = req.query.q ? req.query.q.trim() : ''


        if (q) {            
            let orFilters = []
            orFilters.push({rfc: {$regex: new RegExp(q, 'i')}})
            orFilters.push({razon_social: {$regex: new RegExp(q, 'i')}})
            orFilters.push({codigo: {$regex: new RegExp(q, 'i')}})
            filtroObj['$or'] = orFilters
        }

        if (req.query.accion) {
            switch(req.query.accion) {
                case 'eliminar':
                    let cantEliminada = await dbCliente.clientes.remove(filtroObj, {multi: true})
                    return res.json({
                        status: 'success',
                        message: `${cantEliminada} clientes han sido eliminados.`
                    })
                    break;
            }
        }
        
        let elemPorPag = +(req.query.elemPorPag || 50)
        let requestedUrl = req.protocol + '://' + req.get('Host') + '/api' + req.path
        let paginaActual = +req.query.pagina
        let paginador = await helpers.paginador(dbCliente.clientes, {
            filtroObj: filtroObj,
            elemPorPag: elemPorPag,
            paginaActual: paginaActual,
            requestedUrl: requestedUrl,
            sort: {codigo: 1},
            qs: cloneObject(req.query)
        })
        
        let clientes = paginador.objects
        delete paginador.objects

        return res.json({
            status: 'success',
            objects: clientes,
            paginador: paginador
        })
    })
    .catch((e) => {
        return res.json({status: 'error', message: e.message || 'El token especificado es inválido'})
    })
}

exports.productos = (req, res) => {
    return db._getDB(req.query.api_key).then(async (DB) => {
        let limit = 30
        let q = req.query.q ? req.query.q.trim() : ''
        let conf = await DB.conf.findOne({})
        let cg = conf.configuracion.general
        let query = await DB.productos.cfind({'almacen': conf.almacen.id, activo: true})

        if (req.query.limit) {
            limit = parseInt(req.query.limit);
        }
        
        if (q) {            
            let orFilters = []
            orFilters.push({codigo: {$regex: new RegExp(q, 'i')}})
            orFilters.push({codigo_sin_marca: {$regex: new RegExp(q, 'i')}})
            orFilters.push({ums_codigos_barras: {$elemMatch: q}})
            orFilters.push({descripcion: {$regex: new RegExp(q, 'i')}})
            query = await DB.productos.cfind({'almacen': conf.almacen.id, activo: true, $or: orFilters})
        }
        
        query = query.sort({ codigo: 1})

        if (limit) {
            query = query.limit(limit)
        }

        let docs = await query.exec()
        // se deshabilita temporalmente
        if (limit == 1 && cg.habilitar_venta_cb_cantidad) {
            // sacamos la cantidad de la báscula
            // solamente si el usuario tiene configurada una báscula
            let producto = docs.length ? docs[0] : null
            if (conf.habilitarBascula && conf.bascula && producto && producto.venta_cb_cantidad) {
                helpers.obtenerPesoBascula(conf.bascula).then((data) => {
                    if (data.status == 'success') {
                        return res.json({
                            status: 'success',
                            productoCantidad: true,
                            producto: producto, 
                            cantidad: data.cantidad
                        })
                    }

                    throw data
                })
                .catch((error) => {
                    logger.log('error', error)
                    return res.json(error)
                })
            } else {
                return res.json({
                    objects: docs
                })
            }

        } else {
            return res.json({
                objects: docs
            })
        }

    })
    .catch((e) => {
        return res.json({status: 'error', message: e.message || 'El token especificado es inválido'})
    })
}

exports.productos2 = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {

        let page = req.query.page
        let limit = req.query.perPage
        let conf = await dbCliente.conf.findOne({})
        let almacen_id = conf.almacen ? conf.almacen.id : null
        let filtroObj = {}
        let q = req.query.q ? req.query.q.trim() : ''

        if (req.query.almacen) {
            almacen_id = +req.query.almacen
        }

        if (almacen_id) {
            filtroObj.almacen = almacen_id
        }

        if (q) {            
            let orFilters = []
            orFilters.push({codigo: {$regex: new RegExp(q, 'i')}})
            orFilters.push({codigo_sin_marca: {$regex: new RegExp(q, 'i')}})
            orFilters.push({ums_codigos_barras: {$elemMatch: q}})
            orFilters.push({descripcion: {$regex: new RegExp(q, 'i')}})
            filtroObj['$or'] = orFilters
        }

        if (req.query.activo) {
            filtroObj['activo'] = Boolean(+req.query.activo)
        }

        if (req.query.accion) {
            switch(req.query.accion) {
                case 'eliminar':
                    let cantEliminada = await dbCliente.productos.remove(filtroObj, {multi: true})
                    return res.json({
                        status: 'success',
                        message: `${cantEliminada} productos han sido eliminados.`
                    })
                    break;
            }
        }
        
        let elemPorPag = +(req.query.elemPorPag || 50)
        let requestedUrl = req.protocol + '://' + req.get('Host') + '/api' + req.path
        let paginaActual = +req.query.pagina
        let paginador = await helpers.paginador(dbCliente.productos, {
            filtroObj: filtroObj,
            elemPorPag: elemPorPag,
            paginaActual: paginaActual,
            requestedUrl: requestedUrl,
            sort: {codigo: 1},
            qs: cloneObject(req.query)
        })
        
        let productos = paginador.objects
        delete paginador.objects

        return res.json({
            status: 'success',
            objects: productos,
            paginador: paginador
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.producto = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let id = req.params.id
        let cantidadBascula = req.query.cantidadBascula
        let porCodigo = (req.query.porCodigo || '').toLowerCase() == 'true'
        let conf = await dbCliente.conf.findOne({})
        let producto
        let mensajeFlash 

        if (porCodigo) {
            producto = await dbCliente.productos.findOne({codigo: id, almacen: conf.almacen.id, activo: true})
            
            if (! producto ) {
                // codigos de barra um
                producto = await dbCliente.productos.findOne({ums_codigos_barras: {$elemMatch: id}, almacen: conf.almacen.id, activo: true})

                if( producto ) {
                    // asignamos la um al producto
                    let um = producto.ums.filter((um) => {
                        return um.codigo_barras == id
                    })
                    
                    if (um && um.length) {
                        um = um[0]
                    }

                    producto.um = um
                }
            }

            if (! producto ) {
                let pcb = await productoCodigoBarrasCantidad(id, conf.almacen.id, dbCliente)

                if (pcb.status == 'success') {
                    return res.json(pcb)
                }
            }
        } else {
            producto = await dbCliente.productos.findOne({id: +id, almacen: conf.almacen.id, activo: true})
        }
        
        // Acciones por producto
        if (req.query.accion) {
            let accion = req.query.accion
            producto = await dbCliente.productos.findOne({id: +id})
            
            if (!req.query.usuario_id) {
                return res.json({
                    status: 'error',
                    message: 'Es necesario especificar el id del usuario'
                })
            }

            usuario = await dbCliente.usuarios.findOne({id: +req.query.usuario_id})

            if (!usuario || !usuario.autorizaciones.guardar_configuracion_desktop) {
                return res.json({
                    status: 'error',
                    message: 'No tiene permiso para realizar esta acción'
                })
            }

            if (!producto) {
                return res.json({
                    status: 'error',
                    statusCode: 404,
                    message: 'El producto especificado no existe'
                })
            }

            switch(accion) {
                case 'eliminar':
                    await dbCliente.productos.remove({id: +id})
                    return res.json({
                        status: 'success',
                        message: 'El producto ha sido eliminado'
                    })
                    break;

                case 'sincronizar':
                    return res.json({
                        status: 'success',
                        message: 'El producto ha sido sincronizado'
                    })
                    break;

                default:
                    return res.json({
                        status: 'error',
                        message: 'La acción especificada es inválida'
                    })
                    break;
            }
        }

        if (!producto) {
            return res.json({
                status: 'error',
                statusCode: 404,
                message: 'El producto especificado no existe'
            })
        }

        let consultarAdmintotal = false
        let paramsAt = {api_key: req.query.api_key, claveCliente: dbCliente.claveCliente}
        
        let existenciaAt = false
        let validarExistencia = !conf.configuracion.inventario.facturar_sin_existencia
        let validarPrecioUnitario = conf.configuracion.facturacion.validar_precio_unitario
        
        if ((req.query.cacheIds || '').split(',').indexOf(String(producto.id)) > -1) {
            let internetDisponible = await helpers.validarConexionInternet()
            if (internetDisponible) {
                validarExistencia = false
                existenciaAt = true
            }
        }

        if (conf.mostrarExistenciasAlmacenes) {
            consultarAdmintotal = true
        }
    
        if (consultarAdmintotal || (validarExistencia && (producto.tipo_display || '').toLowerCase() !== 'servicio')) {
            consultarAdmintotal = true
            paramsAt.existencia = {
                producto_id: producto.id, 
                por_almacen: true
            }
        }

        if (validarPrecioUnitario && req.query.cliente) {
            consultarAdmintotal = true
            paramsAt.precio_unitario = {
                producto_id: producto.id,
                cliente_id: req.query.cliente
            }
        }

        if (consultarAdmintotal) {
            try {
                let resultadoConsulta = await helpers.consultarProductoAdmintotal(paramsAt)
                let errores = []
                
                for(var k in resultadoConsulta) {
                    if (resultadoConsulta[k].status === "success") {
                        switch(k) {
                            case "existencia":
                                let validacionExistencia = resultadoConsulta[k]
                                producto.existencia = +validacionExistencia.existencia
                                producto.existenciasAlmacen = validacionExistencia.almacenes
                                producto.validarExistencia = validarExistencia
                                existenciaAt = true
                                break

                            case "precio_unitario":
                                producto.precio_neto = resultadoConsulta[k].precio_unitario
                                producto.precio_neto_at = true
                                break

                            case "precio_minimo":
                                producto.vender_menos_margen_utilidad = resultadoConsulta[k].vender_menos_margen_utilidad
                                producto.precio_minimo = resultadoConsulta[k].precio_minimo
                                producto.precio_minimo_at = true
                                break
                        }

                        await dbCliente.productos.update({_id: producto._id}, {$set: {
                            existencia: producto.existencia,
                            vender_menos_margen_utilidad: producto.vender_menos_margen_utilidad,
                            // precio_unitario: producto.precio_unitario,
                            // precio_minimo: producto.precio_minimo,
                        }})
                    } else {
                        errores.push(`${k}:${resultadoConsulta[k].message || ''}`)
                    }
                }

                if (errores.length) {
                    
                    mensajeFlash = {
                        tipo: 'error', 
                        mensaje: `Error al consultar: ${errores.join(", ")}`
                    }
                }
                
            } catch(e) {
                let cliente = await dbCliente.clientes.findOne({id: +req.query.cliente})
                if (cliente.clasificacion) {
                    if (cliente.almacen) {
                        if (producto.precios_clasificaciones[cliente.almacen][cliente.clasificacion]) {
                            producto.precio_neto = producto.precios_clasificaciones[cliente.almacen][cliente.clasificacion].precio_neto
                        }
                    } else {
                        if (producto.precios_clasificaciones[conf.almacen.id] && producto.precios_clasificaciones[conf.almacen.id][cliente.clasificacion]) {
                            producto.precio_neto = producto.precios_clasificaciones[conf.almacen.id][cliente.clasificacion].precio_neto
                        }
                    }
                }
                logger.log('error', e)
                mensajeFlash = {tipo: 'error', mensaje: 'Error al consultar producto con admintotal.com'}
            }
        }
        
        if (conf.habilitarBascula && cantidadBascula && conf.configuracion.general.habilitar_venta_cb_cantidad) {
            // sacamos la cantidad de la báscula
            // solamente si el usuario tiene configurada una báscula
            let docBascula = conf.bascula
            if (docBascula && producto.venta_cb_cantidad) {
                return helpers.obtenerPesoBascula(docBascula).then((data) => {
                    if (data.status == 'success') {
                        return res.json({
                            status: 'success',
                            productoCantidad: true,
                            producto: producto, 
                            cantidad: data.cantidad,
                            existenciaAt: existenciaAt,
                            mensajeFlash: mensajeFlash
                        })
                    }

                    throw data
                })
                .catch((error) => {
                    logger.log('error', error.message)
                    return res.json({status: 'error', message: error.message || 'Error al seleccionar el producto'})
                })
            } 
        } 
        
        if (producto.imagen) {
            producto.imagen = api.getApiHost(dbCliente.claveCliente) + producto.imagen
        }

        return res.json({
            status: 'success',
            producto: producto,
            existenciaAt: existenciaAt,
            mensajeFlash: mensajeFlash
        })
    })
    .catch((e) => {
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.almacenes = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        return res.json({
            objects: await dbCliente.almacenes.cfind({}).sort({nombre: 1}).exec()
        })
    })
    .catch(() => {
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.almacen = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let id = parseInt(req.params.id)
        let almacen = await dbCliente.almacenes.findOne({id: id})
        return res.json(almacen)
    })
    .catch(() => {
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.configuracion = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let conf = await dbCliente.conf.findOne({})
        if (conf.pinpad && conf.pinpad.usuario && conf.pinpad.password) {
            conf.pinpad.usuario = helpers.decrypt(conf.pinpad.usuario)
            conf.pinpad.password = helpers.decrypt(conf.pinpad.password)
        }
        return res.json(conf)
    })
    .catch(() => {
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.autorizaciones = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let autorizaciones = await dbCliente.autorizaciones.find({})
        return res.json({
            status: 'success',
            objects: autorizaciones
        })
    })
    .catch(() => {
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.sincronizaciones = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let doc = await dbCliente.conf.findOne({})
        return res.json({
            status: 'success',
            objects: doc.sincronizaciones
        })
    })
    .catch(() => {
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.guardarSesionCaja = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        if (!req.body.cajero) {
            return res.json({status: 'error', message: 'El cajero no fué especificado.'})
        }

        let conf = await dbCliente.conf.findOne({})
        let usuario_id = req.body.cajero.id;
        let sesion_caja = {
            _id: uniqid(),
            totalFondo: req.body.totalFondo,
            almacen: req.body.almacen,
            cajero: req.body.cajero,
            denominaciones: req.body.denominaciones,
            fecha: moment().toISOString()

        }

        await dbCliente.usuarios.update({id:usuario_id}, {$set: {sesion_caja: sesion_caja}})
        await dbCliente.sesiones_caja.insert({inicio: sesion_caja, sincronizado:false})
        let imprimir = conf.configuracion.facturacion.imprimir_apertura_caja && conf.impresora
        
        return res.json({
            status: 'success',
            sesion_caja: sesion_caja,
            imprimir: imprimir,
            impresora: conf.impresora
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.cerrarSesionCaja = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        if (!req.body.cajero) {
            return res.json({status: 'error', message: 'El cajero no fué especificado.'})
        }

        let cierre = req.body
        let usuario_id = req.body.cajero.id
        
        cierre.almacen = cierre['inicio']['almacen']        
        cierre['fin']._id = uniqid()
        
        let apiData = {api_key: req.query.api_key}
        apiData.sessionCaja = cierre['inicio']
        apiData.sessionCaja.cierre = cierre['fin']
        opts = {path: '/ventas/cierre-caja/', data: apiData, claveCliente: dbCliente.claveCliente}
        
        try{
            let data = await api._post(opts)
            if (data.status !== 'success') {
                throw data
            }
            cierre['fin'] = Object.assign(cierre['fin'], data.cierre)
        } catch(err) {
            return res.json(err)
        }

        await dbCliente.usuarios.update({'id':cierre.cajero.id}, {$set: {sesion_caja: null}})
        await dbCliente.sesiones_caja.update({'inicio.fecha':cierre.inicio.fecha}, {$set: cierre})
        
        // await dbCliente.ventas.update({'sesionCaja.fecha':cierre['inicio'].fecha}, {$set: {'sesionCaja.cierre': cierre['fin']}})
        let conf = await dbCliente.conf.findOne({}, {impresora: 1})
        let imprimir = conf.impresora ? true : false
        
        return res.json({
            status: 'success',
            sesion_caja: cierre['fin'],
            imprimir: imprimir,
            // impresora: conf.impresora
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.retirarEfectivo = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let sesion_caja = req.body.sesion_caja
        let conf = await dbCliente.conf.findOne({})
        
        if (!sesion_caja.cajero) {
            return res.json({status: 'error', message: 'El cajero no fué especificado.'})
        }
        
        let retiro = req.body.retiro
        let usuario_id = sesion_caja.cajero.id

        retiro._id = uniqid()
        retiro.sincronizado = false
        retiro.sesion_caja = {_id: sesion_caja._id}
        
        await dbCliente.retiros.insert(retiro)
        
        // sincronizar el retiro
        enviarRetiros(req.query.api_key, dbCliente, [retiro]).catch((err) => {
            
        })
        
        let imprimir = conf.impresora ? true : false
        return res.json({
            status: 'success',
            retiro: retiro,
            sesion_caja: sesion_caja,
            imprimir: imprimir,
            impresora: conf.impresora
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.retiros = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        return res.json([])
    })
}

exports.guardarVenta = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let venta = helpers.cloneObject(req.body)
        let conf = await dbCliente.conf.findOne({})
        let solicitarRecarga = venta.solicitiarRecarga || false
        let pagoServicioLdi = venta.pagoServicioLdi || false
        let erroresRecargas = []
        let erroresServiciosLdi = []
        let usuario = await dbCliente.usuarios.findOne({api_token: req.query.api_key})
        let docTrans

        delete venta.solicitiarRecarga
        delete venta.pagoServicioLdi
 
        if (!venta.folio) {
            venta.sincronizada = false
            venta.fecha = moment().toISOString()
            venta.folio = await helpers.getFolio(dbCliente, conf)
            venta.app_version = process.env.APP_VERSION
            venta.numero_serie = conf.numero_serie
        }

        if (venta.credito) {
            venta.efectivo = {}
            venta.tarjeta = {}
            venta.fondo = {}
            venta.monedero = {}
            venta.cheque = {}
            venta.transferencia = {}
        }
        
        if (venta.total == 0 && !conf.permitir_vender_en_cero) {
            return res.json({status: 'error', message: 'No es posible vender en cero'})
        }

        if (!venta.entregaDomicilio) {
            delete venta.fechaEntregaDomicilio
        }
        
        delete venta['sesionCaja']['cajero']['autorizaciones']
        delete venta['sesionCaja']['denominaciones']

        // no_referencia random
        venta.no_referencia = Math.random().toString(36).substring(2, 8).toUpperCase()
        venta.cobrosPinpad = venta.cobrosPinpad || []

        // validación para el uso del pinpad
        let cobrosTarjeta = venta.tarjeta.cobros || []
        if (venta.tarjeta.monto) {
            venta.tarjeta.multiplesTarjetas = Boolean(cobrosTarjeta.length)

            if (!venta.tarjeta.multiplesTarjetas) {
                let servicioCobro = null
                                
                // pinpad banco
                if (conf.habilitarPinpad && !conf.habilitarProsepago) {
                    servicioCobro = conf.pinpad.banco
                }

                // seleccionado por el vendedor
                if (conf.habilitarProsepago && conf.habilitarPinpad) {
                    servicioCobro = venta.pinpadSeleccionado
                }

                if (venta.otraTerminalProsepago) {
                    servicioCobro = ''
                }

                if (servicioCobro) {
                    switch(servicioCobro) {
                        case conf.pinpad.banco:
                            logger.log('info', `Iniciando el cobro con pinpad de la venta ${venta.numero_serie}-${venta.folio}`)
                            try{
                                let statusCobro = await helpers.cobrarVentaPinpad(venta, conf)
                                
                                try {
                                    docTrans = await dbCliente.transacciones_pp.insert({
                                        tipoTransaccion: 'venta',
                                        fecha: moment().toISOString(),
                                        resultado: statusCobro.cobroPinpad,
                                        referencia: statusCobro.cobroPinpad.datos.referencia,
                                        usuario: {
                                            id: usuario.id,
                                            username: usuario.username,
                                        }
                                    })

                                } catch(e) {
                                    logger.log('error', e)
                                }

                                if (statusCobro.status !== 'success') {
                                    statusCobro.transaccion = docTrans
                                    return res.json(statusCobro)
                                }

                                // venta.cobroTarjeta se setea por el método cobrarVentaPinpad
                                if (venta.cobroTarjeta.status !== 'success') {
                                    return res.json({
                                        status: 'error',
                                        transaccion: docTrans,
                                        message: venta.cobroTarjeta.mensaje,
                                        cobrosPinpad: venta.cobrosPinpad
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
                    }
                }

            }
        }

        let d
        let venta_id = venta._id
        venta.pendiente = false
        if (venta_id) {
            delete venta._id
            await dbCliente.ventas.update(
                {_id: venta_id}, 
                {$set: venta}
            )
            d = await dbCliente.ventas.findOne({_id: venta_id})
        } else {
            d = await dbCliente.ventas.insert(venta)
            if (!venta.requiereFactura) {
                await dbCliente.conf.update({}, {$set: {folio_inicial: venta.folio + 1}})
            }
        }

        let clienteDefault = conf.configuracion.facturacion.cliente_mostrador_default;

        if (solicitarRecarga) {
            // envia la venta al momento
            try{
                await habilitarSinc('ventas', [d], dbCliente, false)
                let sincronizacionVenta = await enviarVentas(req.query.api_key, dbCliente, {ventas: [d]})
                await habilitarSinc('ventas', [d], dbCliente, true)

                if (sincronizacionVenta.status != 'success') {
                    throw sincronizacionVenta
                } 
                
                let objStatusRecarga = {}

                sincronizacionVenta.recargas_generadas.map((statusRecarga) => {
                    objStatusRecarga[statusRecarga.numero_recarga] = statusRecarga
                })

                d.productos.map((p, index) => {
                    if (p.numeroTelefonico) {
                        let inline = d.productos[index]
                        inline.statusRecarga = objStatusRecarga[p.numeroTelefonico]
                        d.productos[index] = inline
                        
                        if (inline.statusRecarga.no_aprobacion === 'ERROR') {
                            erroresRecargas.push(objStatusRecarga)
                        }
                    }
                })
                
                d.sincronizada = true
                await dbCliente.ventas.update({_id: d._id}, {$set: d})

            } catch(e) {
                logger.log('error', `Error al solicitar recarga ${d.numero_serie + '-' + d.folio}`)
                await dbCliente.ventas.remove({_id: d._id})
                return res.json({
                    status: 'error', 
                    clienteDefault: clienteDefault,
                    message: 'Hubo un error al solicitar la recarga',
                    ventaGuardada: false,
                })
            }
        } else if(pagoServicioLdi) {
            // envia la venta al momento
            try{
                await habilitarSinc('ventas', [d], dbCliente, false)
                let sincronizacionVenta = await enviarVentas(req.query.api_key, dbCliente, {ventas: [d]})
                await habilitarSinc('ventas', [d], dbCliente, true)

                if (sincronizacionVenta.status != 'success') {
                    throw sincronizacionVenta
                } 
                
                let objStatusServicioLdi = {}

                sincronizacionVenta.recargas_generadas.map((statusRecarga) => {
                    objStatusServicioLdi[statusRecarga.numero_recarga] = statusRecarga
                })

                d.productos.map((p, index) => {
                    if (p.producto.servicio_ldi_referencia) {
                        let inline = d.productos[index]
                        inline.statusRecarga = objStatusServicioLdi[p.producto.servicio_ldi_referencia]
                        d.productos[index] = inline
                        
                        if (inline.statusRecarga.no_aprobacion === 'ERROR') {
                            erroresServiciosLdi.push(objStatusServicioLdi)
                        }
                    }
                })
                
                d.sincronizada = true
                await dbCliente.ventas.update({_id: d._id}, {$set: d})

            } catch(e) {
                logger.log('error', `Error al pagar el servicio ${d.numero_serie + '-' + d.folio}`)
                await dbCliente.ventas.update({_id: d._id}, {$set: {
                    sincronizada: true,
                    timbrada: false,
                    error: true,
                    motivoError: e.message,
                }})
                return res.json({
                    status: 'error', 
                    clienteDefault: clienteDefault,
                    message: 'Hubo un error al solicitar el pago del servicio',
                    ventaGuardada: true,
                })
            }
        } else if (venta.requiereFactura) {
            try{
                await habilitarSinc('ventas', [d], dbCliente, false)
                let sincronizacionVenta = await enviarVentas(req.query.api_key, dbCliente, {ventas: [d]})
                await habilitarSinc('ventas', [d], dbCliente, true)
                
                d.folio = null
                d.timbrada = true

                if (sincronizacionVenta.status != 'success') {
                    throw new Error(sincronizacionVenta)
                } 
                
                if (sincronizacionVenta.ventas.length) {
                    // si se guardo la venta debe de traer el id
                    // dentro del arreglo de ventas
                    d.sincronizada = true
                }

                if (sincronizacionVenta.no_timbradas.length) {
                    d.sincronizada = true
                    d.timbrada = false
                    d.error = true
                    d.motivoError = 'La venta ha sido registrada pero hubo problemas al timbrar la factura.'
                }

                if (d._id in sincronizacionVenta.urls_pdf) {
                    d.urlReciboVenta = sincronizacionVenta.urls_pdf[d._id]
                }
                
                if (d._id in sincronizacionVenta.urls_error_timbrado) {
                    d.urlErrorTimbrado = sincronizacionVenta.urls_error_timbrado[d._id]
                }

                if (d._id in sincronizacionVenta.ventas_guardadas) {
                    d.folio = sincronizacionVenta.ventas_guardadas[d._id].folio
                    d.numero_serie = sincronizacionVenta.ventas_guardadas[d._id].serie
                    d.id = sincronizacionVenta.ventas_guardadas[d._id].id // admintotal id
                }

                await dbCliente.ventas.update({_id: d._id}, {$set: d})
                
                if ( !d.timbrada ) {
                    let msg = d.motivoError
                    logger.log('error', msg)
                    return res.json({
                        status: 'error',
                        message: msg,
                        clienteDefault: clienteDefault,
                        ventaGuardada: true
                    })
                }
                
            } catch(e) {
                logger.log('error', e)
                
                if (d.tarjeta && !d.tarjeta.cobros) {
                    logger.log('error', `Eliminando venta ${d.numero_serie}-${d.folio}`)
                    await dbCliente.ventas.remove({_id: d._id})
                } else {
                    await dbCliente.ventas.update({_id: d._id}, {$set: {pendiente: true}})
                }

                return res.json({
                    status: 'error', 
                    message: 'Hubo un error al solicitar la factura.',
                    clienteDefault: clienteDefault,
                    ventaGuardada: false
                })
            }
        } else if (venta.fondo.monto || venta.monedero.monto) {
            try{
                await habilitarSinc('ventas', [d], dbCliente, false)
                let sincronizacionVenta = await enviarVentas(req.query.api_key, dbCliente, {ventas: [d]})
                await habilitarSinc('ventas', [d], dbCliente, true)
                
                if (sincronizacionVenta.status != 'success') {
                    throw new Error(sincronizacionVenta)
                } 
                
                if (sincronizacionVenta.ventas.length) {
                    // si se guardo la venta debe de traer el id
                    // dentro del arreglo de ventas
                    d.sincronizada = true
                }

                if (sincronizacionVenta.no_timbradas.length) {
                    d.sincronizada = true
                    d.timbrada = false
                    d.error = true
                    d.motivoError = 'La venta ha sido registrada pero hubo problemas al timbrar la factura.'
                }

                if (d._id in sincronizacionVenta.urls_pdf) {
                    d.urlReciboVenta = sincronizacionVenta.urls_pdf[d._id]
                }

                await dbCliente.ventas.update({_id: d._id}, {$set: d})
                try {
                    await helpers.actualizarCliente({dbCliente:dbCliente, clienteId:d.cliente.id, api_key: req.query.api_key})
                } catch(e) {
                    logger.log('error', e)
                }
                
            } catch(e) {
                logger.log('error', e)

                if (d.tarjeta && !d.tarjeta.cobros) {
                    logger.log('error', `Eliminando venta ${d.numero_serie}-${d.folio}`)
                    await dbCliente.ventas.remove({_id: d._id})
                } else {
                    await dbCliente.ventas.update({_id: d._id}, {$set: {pendiente: true}})
                }

                return res.json({
                    status: 'error',
                    clienteDefault: clienteDefault, 
                    message: 'Hubo un problema al enviar la venta a admintotal.',
                    ventaGuardada: false
                })
            }
        } else {
            // sincronizar la venta
            await habilitarSinc('ventas', [d], dbCliente, false)
            enviarVentas(req.query.api_key, dbCliente, {ventas: [d]})
            .then(async (sincronizacionVenta) => {
                if (sincronizacionVenta.ventas.length) {
                    // si se guardo la venta debe de traer el id
                    // dentro del arreglo de ventas
                    d.sincronizada = true
                }
                await habilitarSinc('ventas', [d], dbCliente, true)
                await dbCliente.ventas.update({_id: d._id}, {$set: d})
            })
            .catch(async (err) => {
                await habilitarSinc('ventas', [d], dbCliente, true)
            })
        }

        let imprimir = conf.impresora ? true : false
        
        return res.json({
            status: 'success', 
            message: 'La venta ha sido guardada correctamente', 
            venta: d, 
            imprimir: imprimir,
            app_version: d.app_version,
            clienteDefault: clienteDefault,
            impresora: conf.impresora,
            erroresRecargas: erroresRecargas,
            erroresServiciosLdi: erroresServiciosLdi
        })
        
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e.message || 'El token especificado es inválido'
        })
    })
}

exports.cancelarOperacionTarjeta = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let conf = await dbCliente.conf.findOne({})
        let pinpad = await helpers.getPinpadInstance(conf.pinpad)
        let c = await pinpad.cancelarOperacion()
        return res.json(c)
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e.message || 'El token especificado es inválido'
        })
    })
}

exports.obtenerInfoTarjeta = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let conf = await dbCliente.conf.findOne({})
        let servicioCobro = null
        let monto = req.query.monto

        if (!monto || +monto === 0) {
            return res.json({
                status: 'error',
                message: 'El monto no puede ser 0.'
            })
        }
            
        // prosepago
        if (conf.habilitarProsepago && !conf.habilitarPinpad) {
            return res.json({
                status: 'error',
                message: 'Esta función no esta disponible para la integración de prosepago.'
            })
        }
        
        // pinpad banco
        if (conf.habilitarPinpad && !conf.habilitarProsepago) {
            servicioCobro = conf.pinpad.banco
        }

        if (servicioCobro) {
            switch(servicioCobro) {
                case conf.pinpad.banco:
                    logger.log('info', `Obteniendo información de tarjeta`)
                    try{
                        let pinpad = await helpers.getPinpadInstance(conf.pinpad)
                        let infoTarjeta = await pinpad.obtenerInfoTarjeta(monto)
                        return res.json(infoTarjeta)
                    } catch(e) {
                        logger.log('error', e.message || 'Error al obtener información de la tarjeta')

                        return res.json({
                            status: 'error',
                            message: e.message || 'Error al realizar el cobro'
                        })
                    }
                    break
            }
        }

        return res.json({
            status: 'error',
            message: 'Error al procesar su solicitud.'
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e.message || 'El token especificado es inválido'
        })
    })
}

exports.cobrarVentaTarjeta = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let conf = await dbCliente.conf.findOne({})
        let ventaObj = req.body
        let insert = false
        let cobroId = null
        let venta

        if (ventaObj._id) {
            venta = await dbCliente.ventas.findOne({_id: ventaObj._id})
        } else {
            venta = await dbCliente.ventas.findOne({
                folio: ventaObj.folio, 
                numero_serie: ventaObj.numero_serie,
                fecha: ventaObj.fecha
            })
        }

        let usuario = await dbCliente.usuarios.findOne({api_token: req.query.api_key})
        let docTrans

        const setMontoTarjetaCobrado = ({venta, dbCliente}) => {
            return new Promise(async (resolve, reject) => {
                try {
                    let montoTarjetaCobrado = 0
                    venta.tarjeta.cobros.forEach(cobro => {
                        montoTarjetaCobrado += cobro.importe
                    })
                    
                    venta.cambio -= venta.tarjeta.monto
                    venta.tarjeta.monto = montoTarjetaCobrado
                    venta.cambio += venta.tarjeta.monto

                    if (dbCliente) {
                        await dbCliente.ventas.update(
                            {folio: venta.folio, numero_serie: venta.numero_serie, fecha: venta.fecha}, 
                            {$set: venta}
                        )
                    }

                    resolve()
                } catch (e) {
                    resolve()
                    logger.log('error', e)
                }
            })
        }

        if ( !venta ) {
            venta = ventaObj
            insert = true
            venta.sincronizada = false
            venta.fecha = moment().toISOString()
            venta.folio = await helpers.getFolio(dbCliente, conf)
            venta.numero_serie = conf.numero_serie    
            venta.pendiente = true
        }

        venta.tarjeta.monto = ventaObj.tarjeta.monto
        
        if (venta.tarjeta.monto > venta.total) {
        	return res.json({
                status: 'error',
                message: `
                    El monto a cobrar no puede ser mayor al total de la venta. 
                    Total venta: $${venta.total} / A cobrar: $${venta.tarjeta.monto} 
                `
            })
        }
                
        if (!Array.isArray(venta.tarjeta.cobros)) {
            venta.tarjeta.cobros = []
        }

        if (insert) {
            let borrador = helpers.cloneObject(venta)
            borrador.tarjeta.cobros = []
            borrador.app_version = process.env.APP_VERSION
            venta = await dbCliente.ventas.insert(borrador)
            if ( !venta.requiereFactura ) {
                await dbCliente.conf.update({}, {$set: {folio_inicial: venta.folio + 1}})
            }
        }

        let servicioCobro = null
        let numAffected = null
        let upsert = null
                    
        // pinpad banco
        if (conf.habilitarPinpad && !conf.habilitarProsepago) {
            servicioCobro = conf.pinpad.banco
        }

        if (servicioCobro) {
            if (!venta.cobrosPinpad) {
                venta.cobrosPinpad = []
            }

            switch(servicioCobro) {
                case conf.pinpad.banco:
                    logger.log('info', `Iniciando el cobro con pinpad de la venta ${venta.numero_serie}-${venta.folio} por el monto de $${venta.tarjeta.monto}`)
                    try {
                        let statusCobro = await helpers.cobrarVentaPinpad(venta, conf)

                        try {
                            // se guarda el registro de la transacción en caso de tener los datos
                            if (statusCobro.cobroPinpad && statusCobro.cobroPinpad.datos && statusCobro.cobroPinpad.datos.referencia) {
                                docTrans = await dbCliente.transacciones_pp.insert({
                                    tipoTransaccion: 'venta',
                                    fecha: moment().toISOString(),
                                    resultado: statusCobro.cobroPinpad,
                                    referencia: statusCobro.cobroPinpad.datos.referencia,
                                    usuario: {
                                        id: usuario.id,
                                        username: usuario.username,
                                    }
                                })
                            }
                        } catch(e) {
                            logger.log('error', e)
                        }

                        if (statusCobro.status !== 'success') {
                            statusCobro.transaccion = docTrans
                            statusCobro.venta = venta
                            logger.log('error', statusCobro)

                            venta.tarjeta.monto -= venta.tarjeta.monto
                            await setMontoTarjetaCobrado({venta, dbCliente})
                            return res.json(statusCobro)
                        }
                    } catch(e) {
                        logger.log('error', e.message || 'Error al realizar el cobro')

                        return res.json({
                            status: 'error',
                            message: e.message || 'Error al realizar el cobro'
                        })
                    }

                    break
            }

            if (venta.cobroTarjeta) {
                cobroId = uniqid()

                venta.tarjeta.cobros.push({
                    _id: cobroId,
                    status: 'success',
                    datos: venta.tarjeta.datos,
                    integracion: venta.tarjeta.integracion,
                    importe: +venta.tarjeta.datos.importe,
                    creado: moment().toISOString()
                })

                await setMontoTarjetaCobrado({venta})

                delete venta.tarjeta.integracion
                delete venta.tarjeta.no_tarjeta
                delete venta.tarjeta.tipo_tarjeta
                delete venta.tarjeta.datos
                
                venta.sincHabilitada = false
                
                await dbCliente.ventas.update(
                    {folio: venta.folio, numero_serie: venta.numero_serie, fecha: venta.fecha}, 
                    {$set: venta}
                )
                
                venta = await dbCliente.ventas.findOne({
                    folio: ventaObj.folio, 
                    numero_serie: ventaObj.numero_serie, 
                    fecha: venta.fecha
                })

                if (insert && !venta.requiereFactura) {
                    await dbCliente.conf.update({}, {$set: {folio_inicial: venta.folio + 1}})
                }
           }

        }

        return res.json({
            status: 'success',
            venta: venta,
            cobroId: cobroId
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e.message || 'El token especificado es inválido'
        })
    })

}

exports.guardarPedido = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let pedido = req.body
        let conf = await dbCliente.conf.findOne({})
        let d = {}

        if (!pedido.entregaDomicilio) {
            delete pedido.fechaEntregaDomicilio
        }
        
        if (! pedido._id ) {
            delete pedido._id
            pedido.fecha_sincronizacion = null
            pedido.fecha = moment().toISOString()
            pedido.usuario = {id: pedido.usuario.id, username: pedido.usuario.username}
            
            if (pedido.total == 0 && !conf.permitir_vender_en_cero) {
                return res.json({status: 'error', message: 'No es posible vender en cero'})
            }
            
            // no_referencia random
            d = await dbCliente.pedidos.insert(pedido)
        } else {
            await dbCliente.pedidos.update({_id: pedido._id}, {$set: pedido})
            d = pedido
        }


        return res.json({
            status: 'success', 
            message: 'El pedido ha sido guardado correctamente', 
            pedido: d
        })
        
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.cambiarStatusVentas = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let serie = req.body.serie
        let ids = req.body.ventas || []
        
        if (!serie || serie === '') {
            return res.json({
                status: 'error',
                message: 'Es necesario especificar la nueva serie.'
            })
        }

        if (!ids.length) {
            return res.json({
                status: 'error',
                message: 'Ningún id de venta fué especificado.'
            })
        }

        let ventas = await dbCliente.ventas.update({_id: {$in: ids}}, {$set: {numero_serie: serie}}, {multi: true})
        return res.json({
            status: 'success',
            message: `${ventas} han sido actualizadas correctamente.`
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.ventas = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        if (!req.query.usuario) {
            return res.json({
                status: 'error',
                message: 'Es necesario especificar usuario id'
            })
        }

        let page = req.query.page
        let limit = req.query.perPage
        let usuario = await dbCliente.usuarios.findOne({id: Number(req.query.usuario)})
        let filtroObj = {}
        
        if (! usuario.autorizaciones.guardar_configuracion_desktop ) {
            filtroObj['sesionCaja.cajero.id'] = +req.query.usuario
        }

        if (req.query.sesion_caja) {
            filtroObj['sesionCaja._id'] = req.query.sesion_caja
        }
        

        if (req.query.sincronizadas) {
            filtroObj['sincronizada'] = Boolean(+req.query.sincronizadas)
        }

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

        if (req.query.folio) {
            filtroObj.folio = +req.query.folio
        }
        
        if (req.query.sincronizada === 'false') {
            filtroObj.sincronizada = false
        }

        if (req.query.status) {
            filtroObj['$or'] = []

            req.query.status.split(',').forEach((status) => {
                let f = {}
                if (status === 'error') {
                    f.error = true
                } else if (status === 'pendientes') {
                    f.sincronizada = false
                } else if (status === 'sincronizadas') {
                    f.error = {$exists: false}
                    f.sincronizada = true
                }

                filtroObj['$or'].push(f)
            })
            
        }

    
        let elemPorPag = +(req.query.elemPorPag || 50)
        let requestedUrl = req.protocol + '://' + req.get('Host') + '/api' + req.path
        let paginaActual = +req.query.pagina
        let paginador = await helpers.paginador(dbCliente.ventas, {
            filtroObj: filtroObj,
            elemPorPag: elemPorPag,
            paginaActual: paginaActual,
            requestedUrl: requestedUrl,
            sort: {fecha: -1},
            qs: cloneObject(req.query)
        })
        
        let ventas = paginador.objects
        
        let sesionActiva = usuario.sesion_caja
        let totalRetiro = 0
        let retiros;
        
        if (sesionActiva) {
            let retirosSincronizados = 0
            retiros = await dbCliente.retiros.find({'sesion_caja._id': sesionActiva._id}) || []

            retiros.map((r, index) => {
                delete r['almacen']
                delete r['cajero']
                delete r['denominaciones']
                totalRetiro += r.totalFondo
                retiros[index] = r
                if (r.sincronizado) {
                    retirosSincronizados += 1
                }
            })

            retiros = {
                totalRetirado: totalRetiro,
                sincronizados: retirosSincronizados,
                objects: retiros,
                sesion_activa: true
            }
        }
        
        
        return res.json({
            status: 'success',
            objects: ventas,
            retiros: retiros,
            paginador: paginador,
            ventasRealizadas: paginador.total
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.venta = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let venta = await dbCliente.ventas.findOne({_id: req.params.id})
        
        venta.cliente = await dbCliente.clientes.findOne({id: venta.cliente.id})

        if (venta) {
            return res.json({
                status: 'success',
                venta: venta
            })
        }

        return res.json({
            status: 'error',
            message: 'La venta especificada no existe.'
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.sesionCajaDetalle = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let doc = await dbCliente.sesiones_caja.findOne({_id: req.params.id})
        let sesionCaja = {
            cajero: doc.cajero,
            inicio: doc.inicio,
            fin: doc.fin,
            ventas: await dbCliente.ventas.cfind({'sesionCaja._id': doc.inicio._id}).sort({folio: 1}).exec(),
            retiros: await dbCliente.retiros.find({'sesion_caja._id': doc.inicio._id}) || []
        }

        if (!sesionCaja.cajero) {
            sesionCaja.cajero = doc.inicio.cajero
        }

        return res.json({
            status: 'success',
            datos: sesionCaja
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.pedidos = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let usuario = await dbCliente.usuarios.findOne({id: Number(req.query.usuario)})
        let filtroObj = {}
        if (! usuario.autorizaciones.guardar_configuracion_desktop ) {
            filtroObj = {
                'usuario.id': +req.query.usuario
            }
        }
        let limit = 100
        let pedidos = await dbCliente.pedidos.cfind(filtroObj).sort({fecha: -1}).limit(limit).exec()
        
        return res.json({
            status: 'success',
            objects: pedidos,
            limite: limit,
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.pedido = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let usuario = await dbCliente.usuarios.findOne({id: Number(req.query.usuario)})
        let pedido = await dbCliente.pedidos.findOne({'_id': req.params.id})
        let productos_ids = []

        let proms = pedido.productos.map(async (p) => {
            let producto = await dbCliente.productos.findOne({id: p.producto.id})
            p.producto = producto
            return p
        })

        pedido.cliente = await dbCliente.clientes.findOne({id: pedido.cliente.id})

        return Promise.all(proms).then((productos) => {
            pedido.productos = productos
            return res.json({
                status: 'success',
                pedido: pedido,
            })
        })

    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.imprimirVoucher = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let venta = await dbCliente.ventas.findOne({_id: req.params.id})
        let recepcion_pago = null
        let obj = venta

        if (req.query.recepcion_pago) {
            recepcion_pago = await dbCliente.recepciones_pago.findOne({_id: req.params.id})
            obj = recepcion_pago
        }


        let idCobro = req.params.idCobro
        let conf = await dbCliente.conf.findOne({})
        let cobro



        if (idCobro) {
            cobro = obj.tarjeta.cobros.find(e => {
                return e._id == idCobro
            })

            if (cobro) {
                let infoCobro = cobro.datos
                obj.tarjeta.datos = infoCobro
                obj.tarjeta.integracion = cobro.integracion
                obj.tarjeta.no_tarjeta = infoCobro.no_tarjeta
                obj.tarjeta.tipo_tarjeta = infoCobro.tipo_tarjeta
                obj.tarjeta.referencia = infoCobro.referencia
            }
        }
        
        switch(obj.tarjeta.integracion) {
            case 'banorte':
                return res.render('impresiones/voucher.html', {
                    conf: conf.configuracion,
                    banco: conf.pinpad.banco,
                    almacen: conf.almacen,
                    tipo: req.params.tipo,
                    numero_serie: obj.numero_serie || conf.numero_serie,
                    impresora: conf.impresora ? conf.impresora : {},
                    venta: obj,
                    titulo: `voucher_${req.params.tipo}_venta_${conf.numero_serie}-${obj.folio}`
                })
                break

            case 'santander':
                let getRspVoucher = obj.cobroTarjeta.getRspVoucher
                let numeroControl = obj.cobroTarjeta.numeroControl

                
                if(cobro) {
                    getRspVoucher = cobro.datos.getRspVoucher
                    numeroControl = cobro.datos.numeroControl
                }

                if (req.query.re && req.query.re !== "" && numeroControl) {
                    let conexion = await api.checkConnection({returnBool: true})
                    if (!conexion) {
                        return res.send("Prolemas de conexión, asegurese de estar conectado a internet.")
                    }
                    let pinpad = await helpers.getPinpadInstance(conf.pinpad)
                    let d = await pinpad.reimprimirVoucher(numeroControl, req.params.tipo)
                    getRspVoucher = d.getRspVoucher
                }

                let t = await helpers.voucherToHtml(getRspVoucher, req.params.tipo, conf.impresora)
                return res.send(t)
                break
        }

    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.imprimirVoucherTransaccion = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let idTransaccion = req.params.id
        let conf = await dbCliente.conf.findOne({})
        let trans = await dbCliente.transacciones_pp.findOne({_id: idTransaccion})
        let tiposTransacciones = {
            cancelacion: 'Cancelación',
            devolucion: 'Devolución',
            venta: 'Venta',
        }

        switch(trans.resultado.integracion) {
            case 'banorte':
                var tagsEmv = []
                if (trans.resultado.datos && trans.resultado.datos.declinadaChip === "1" && trans.resultado.datos.tagsEmv) {
                    let getTagsEmv = (tagsStr) => {
                        var emv = require('node-emv');  
                        return new Promise((resolve, reject) => {
                            emv.describe(tagsStr, function(data){
                                let tags = {}
                                var tagsEmvValidos = ['4F', '50', '9F12', '9F26', '9F27', '9F10', '9F37', '9F36', '95', '9A', 
                                '9C', '9F02', '5F2A', '82', '5A', '9F1A', '9F33', '9F34', '9F03', '5F34']

                                if (data && data.length) {
                                    data.forEach((e) => {
                                        if (tagsEmvValidos.indexOf(e.tag) > -1) {
                                            tags[e.tag] = e
                                        }
                                    })

                                    if (tags['9F12']) {
                                        delete tags['50']
                                    }

                                    resolve(Object.values(tags))
                                }
                            })
                        })
                    }

                    tagsEmv = await getTagsEmv(trans.resultado.datos.tagsEmv)
                }

                return res.render('impresiones/voucher-transaccion.html', {
                    conf: conf.configuracion,
                    tipoVoucher: tiposTransacciones[trans.tipoTransaccion],
                    banco: conf.pinpad.banco,
                    almacen: conf.almacen,
                    transaccion: trans,
                    tagsEmv: tagsEmv,
                    tipo: req.params.tipo,
                    titulo: `voucher_${trans.tipoTransaccion}_${trans.referencia}`
                })

                break

            case 'santander':
                if (!trans.resultado.getRspVoucher) {
                    return res.send("")
                }

                let t = await helpers.voucherToHtml(trans.resultado.getRspVoucher, req.params.tipo, conf.impresora)
                return res.send(t)
                break
        }

    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.imprimirRecibo = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let docVenta = await dbCliente.ventas.findOne({_id: req.params.id})
        let conf = await dbCliente.conf.findOne({})
        let venta = Object.assign({}, docVenta)
        let almacen = await dbCliente.almacenes.findOne({id: venta.sesionCaja.almacen.id})
        let mostrarDirFiscal = conf.configuracion.facturacion.mostrar_direccion_fiscal && !almacen.es_sucursal 
        
        return res.render('impresiones/recibo_venta.html', {
            conf: conf.configuracion,
            numero_serie: venta.numero_serie || conf.numero_serie,
            impresora: conf.impresora ? conf.impresora : {},
            venta: venta,
            app_version: venta.app_version,
            almacen: almacen,
            mostrarDirFiscal: mostrarDirFiscal,
            titulo: `venta_${conf.numero_serie}-${venta.folio}`
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.imprimirFondoCaja = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let f = {}
        let conf = await dbCliente.conf.findOne({})
        let tipo = req.params.tipo
        if (['inicio', 'fin'].indexOf(tipo) < 0) {
            throw new Error('Es necesario especificar si desea el inicio o fin de la sesión')
        }
        
        let titulo = tipo == 'inicio' ? 'Apertura de caja' : 'Corte de caja'
        f[`${tipo}._id`] = req.params.idSesion
        let sesion = await dbCliente.sesiones_caja.findOne(f)
        if (!sesion) {
            let ss = await dbCliente.sesiones_caja.find({})
            throw new Error('La sesión solicitada no existe.')
        }
        
        if (tipo == 'fin') {
            sesionInicial = sesion.inicio
            sesion = sesion[tipo]
        } else {
            sesion = sesion[tipo]
            sesion.fondo = sesion.totalFondo
        }
        
        return res.render('impresiones/fondo_caja.html', {
            general: conf.configuracion.general,
            inventario: conf.configuracion.inventario,
            sesion: sesion,
            tipo: tipo,
            titulo: titulo,
            impresora: conf.impresora ? conf.impresora : {},
            tituloPagina: `${titulo} - ${sesion.fecha}`
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.imprimirCortePinPad = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let f = {}
        let conf = await dbCliente.conf.findOne({})
        let titulo = 'Corte Pinpad'
        let sesion = await dbCliente.sesiones_caja.findOne({
            'fin._id': req.params.idSesion
        })

        if (!sesion) {
            throw new Error('La sesión solicitada no existe.')
        }
        
        return res.render('impresiones/corte_pinpad.html', {
            general: conf.configuracion.general,
            inventario: conf.configuracion.inventario,
            sesion: sesion,
            titulo: titulo,
            impresora: conf.impresora ? conf.impresora : {},
            tituloPagina: `${titulo} ${moment(sesion.inicio.fecha).format('DD/MM/YY HH:mm')} - ${moment(sesion.fin.fecha).format('DD/MM/YY HH:mm')}`
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.imprimirRetiroEfectivo = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let titulo = 'Retiro de Efectivo'
        let conf = await dbCliente.conf.findOne({})
        let retiro = await dbCliente.retiros.findOne({_id: req.params.idRetiro})
        retiro.fondo = retiro.totalFondo

        return res.render('impresiones/fondo_caja.html', {
            inventario: conf.configuracion.inventario,
            general: conf.configuracion.general,
            sesion: retiro,
            titulo: titulo,
            tipo: 'retiro',
            impresora: conf.impresora ? conf.impresora : {},
            tituloPagina: `${titulo} - ${retiro.fecha}`
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.imprimirHojaPrueba = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let conf = await dbCliente.conf.findOne({})
        return res.render('impresiones/hoja_prueba.html', {
            general: conf.configuracion.general,
            inventario: conf.configuracion.inventario,
            impresora: conf.impresora ? conf.impresora : {},
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.validarAutorizacion = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        if (!req.body.clave) {
            return res.json({autorizado: false})
        }

        let autorizacion = await dbCliente.autorizaciones.findOne({clave: req.body.clave})
        if (autorizacion) {
            return res.json({autorizado: autorizacion[req.body.autorizacion] || false, responsable: autorizacion.responsable})
        }
        
        return res.json({autorizado: false})
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.validarVentasAt = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        api.checkConnection().then(async () => {
            let data = {
                api_key: req.query.api_key,
                folios: req.body.folios,
                cajero_id: req.body.cajeroId,
                fecha_sesion: req.body.fechaSesion,
            }

            let opts = {
                path: '/ventas/validar-ventas/', 
                data: data, 
                claveCliente: dbCliente.claveCliente
            }
            
            try{
                let resp = await api._post(opts)
                return res.json(resp)
            } catch(e) {
                return res.json({
                    status: 'error',
                    message: e || 'Error al validar ventas'
                })
            }
        }).catch(e => {
            return res.json({
                status: 'error',
                message: 'Es necesaria la conexión a internet para validar las ventas.'
            })
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.guardarConfiguracion = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        if (! req.body.almacen ) {
            return res.json({status: 'error', message: 'El almacen especificado no existe'})
        }

        let almacen = await dbCliente.almacenes.findOne({id: req.body.almacen.id})
        let confActual = await dbCliente.conf.findOne({})
        let numero_serie = confActual ? confActual.numero_serie : null;
        let usuario = await dbCliente.usuarios.findOne({api_token: req.query.api_key}, {id: 1})
        let apiData = {api_key: req.query.api_key, usuario_creado: usuario.id}

        let serieActual = confActual.numero_serie
        let serieNueva = req.body.numero_serie

        let cambioAlmacen = confActual.almacen ? confActual.almacen.id !== almacen.id : true
        
        if ( serieNueva ) {
            apiData.serie = serieNueva
            opts = {path: '/series/', data: apiData, claveCliente: dbCliente.claveCliente}
            try{
                let serieValida = await api._post(opts)

                if (serieValida.status == 'error') {
                    return res.json(serieValida)
                }

                numero_serie = serieValida.serie
                if (+serieValida.ultimo_folio >= +req.body.folio_inicial) {
                    return res.json({
                        status: 'error',
                        message: 'El folio inicial debe de ser igual o mayor a ' + serieValida.ultimo_folio
                    })
                }
            } catch(err) {
                logger.log('error', err)
                return res.json(err)
            }
        }
        let pinpad = req.body.pinpad

        if (pinpad.usuario) {
            pinpad.usuario = helpers.encrypt(pinpad.usuario)
        }

        if (pinpad.password) {
            pinpad.password = helpers.encrypt(pinpad.password)
        }
        
        process.env.NUMERO_SERIE = numero_serie
        let conf = {
            numero_serie: numero_serie, 
            folio_inicial: req.body.folio_inicial,
            almacen: almacen, 
            impresora: req.body.impresora,
            habilitarBascula: req.body.habilitarBascula,
            bascula: req.body.bascula,
            terminal: req.body.terminal || null,
            mostrarCamposAdicionales: req.body.mostrarCamposAdicionales,
            forzarDescargaProductosInicioSesion: req.body.forzarDescargaProductosInicioSesion,
            mostrarExistenciasAlmacenes: req.body.mostrarExistenciasAlmacenes,
            modoKiosko: req.body.modoKiosko,
            habilitarProsepago: req.body.habilitarProsepago,
            habilitarPinpad: req.body.habilitarPinpad,
            pinpad: pinpad,
        }

        if (req.body.impresiones) {
            conf.impresiones = req.body.impresiones
        }

        await dbCliente.conf.update({}, {$set: conf})
        
        return res.json({
            status: 'success', 
            configuracion: await dbCliente.conf.findOne({}),
            descargarProductos: cambioAlmacen,
        })
    })
    .catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e || 'El token especificado es inválido'
        })
    })
}

exports.obtenerPuertosSeriales = (req, res) => {
    // Linux
    // sudo gpasswd --add ${USER} dialout
    // sudo chmod 666 hardware.comName
    SerialPort.list().then((list) => {
        return res.json({
            status: 'success',
            objects: list
        })
    })
    .catch((err) => {
        logger.log('error', {message: 'Hubo un error al obtener los puertos seriales', e: err})
        return res.json({status: 'error', e: err})
    })
}

exports.exportarVentasError = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let usuario = await dbCliente.usuarios.findOne({api_token: req.query.api_key})
        let ventas = await dbCliente.ventas.cfind({error: {$exists: true}, 'sesionCaja.cajero.id': usuario.id}, {sesionCaja: 0}).sort({fecha: -1}).exec()
    
        res.setHeader('Content-disposition', `attachment; filename=${usuario.username}-ventas-error.json`)
        res.setHeader('Content-Type', [
            "application/json",
            "text/plain; charset=UTF-8"
        ])

        return res.send(JSON.stringify({
            fecha: moment().toISOString(),
            usuario: {
                id: usuario.id,
                username: usuario.username,
            },
            ventas: ventas
        }))
    })
}

exports.obtenerUltimoFolio = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        api.checkConnection().then(async () => {
            try {
                let apiData = {api_key: req.query.api_key, serie: req.params.serie}
                opts = {path: '/series/ultimo-folio', data: apiData, claveCliente: dbCliente.claveCliente}
                let apicall = await api._get(opts)

                if (req.query.actualizar == '1' && (+apicall.ultimo_folio || +apicall.ultimo_folio === 0)) {
                    await dbCliente.conf.update({numero_serie: req.params.serie}, {$set: {
                        folio_inicial: +apicall.ultimo_folio + 1
                    }})
                }

                res.json({
                    status: 'success',
                    ultimo_folio: apicall.ultimo_folio
                })
            } catch(e) {
                logger.log('error', e)
                res.json({
                    status: 'error'
                })
            }
        }).catch(e => {
            return res.json({
                status: 'error',
                message: 'Es necesaria la conexión a internet para continuar.'
            })
        })
    }).catch((e) => {
        return res.send("Error al obtener db")
    })
}

exports.inicializarPinpad = (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let conf = await dbCliente.conf.findOne({})

        if (! conf.habilitarPinpad ) {
            return res.json({
                status: 'error',
                message: 'El pinpad no se encuentra habilitado, asegurese de guardar la configuración antes de validarla.'
            })
        }

        if (! conf.pinpad.modeloPinpad ) {
            return res.json({
                status: 'error',
                message: 'Seleccione el modelo de su pinpad'
            })
        }

        /* Si el pinpad es banorte se debe validar que java este instalado */
        if((conf.pinpad.banco || '').toLowerCase() === 'banorte') {
            try {
                await helpers.javaVersion()
            } catch(e) {
                return res.json(e)
            }
        }

        try {
            if (process.pinpadInstance && ('liberarDispositivo' in process.pinpadInstance)) {
                process.pinpadInstance.liberarDispositivo()
            }
            
            process.pinpadInstance = null
            let pinpad = await helpers.getPinpadInstance(conf.pinpad)

            if (req.query.instance) {
                return res.json({
                    status: 'success'
                })
            }

            try {
                if (('configurar' in pinpad)) {
                    let resultadoConf = pinpad.configurar();
                    if (resultadoConf.status !== "success") {
                        logger.log('error', {resultadoConf: resultadoConf, message: 'Hubo un error al configurar el pinpad'})
                        return res.json({status: 'error', message: resultadoConf.mensaje || String(resultadoConf)})
                    }
                }
                
                return res.json({
                    status: 'success',
                    message: 'Pinpad configurado correctamente.'
                })
            } catch(e) {
                pinpad.liberarDispositivo()
                logger.log('error', e)
                return res.json({status: 'error', message: e.mensaje || String(e)})
            }
        } catch(err) {
            logger.log('error', err)
            return res.json(err)
        }
    })
}

exports.dashboard = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let data = {}
        let sc
        let usuario = await dbCliente.usuarios.findOne({api_token: req.query.api_key})
        let paginaActual = +req.query.pagina
        let elemPorPag = 10
        let sesionesCaja = []
        let recepcionesPago = []
        let filtroObj = {}
        let proj = {
            'inicio.cajero': 1, 
            'inicio.totalFondo': 1, 
            'inicio.fecha': 1, 
            'inicio._id': 1, 
            'fin.totalFondo': 1, 
            'fin.fecha': 1, 
            'fin.denominaciones': 1, 
            'fin._id': 1, 
            'cajero.username': 1,
            'cajero.id': 1,
            '_id': 1,
        }

        if (usuario.autorizaciones.guardar_configuracion_desktop) {
            // muestra sesiones de todos los cajeros
            filtroObj = {}
        } else {
            filtroObj = { 'cajero.id': usuario.id}
        }

        let requestedUrl = req.protocol + '://' + req.get('Host') + '/api' + req.path    
        let paginador = await helpers.paginador(dbCliente.sesiones_caja, {
            filtroObj: filtroObj,
            elemPorPag: elemPorPag,
            paginaActual: paginaActual,
            requestedUrl: requestedUrl,
            projection: proj,
            sort: {'inicio.fecha': -1},
            qs: cloneObject(req.query)
        })

        let proms = paginador.objects.map(async (s) => {
            let sesionCopia = cloneObject(s)
            sesionCopia.totalVentas = await dbCliente.ventas.count({'sesionCaja._id': sesionCopia.inicio._id})
            sesionCopia.totalVentasSinc = await dbCliente.ventas.count({'sesionCaja._id': sesionCopia.inicio._id, 'sincronizada': true})

            if (sesionCopia.fin) {
                sesionCopia.fin.totalFondo = +sesionCopia.fin.totalFondo

                if (sesionCopia.fin.totalFondo == 0) {
                    sesionCopia.fin.denominaciones.map(d => {
                        if (d.cantidad) {
                            sesionCopia.fin.totalFondo += d.denominacion * d.cantidad
                        }
                    })
                }

                delete sesionCopia.fin.denominaciones
            } else {
                sesionCopia.cajero = sesionCopia.inicio.cajero
            }
            return sesionCopia
        })

        await Promise.all(proms).then(async (data) => {
            sesionesCaja = data
        })


        data = {
            'status': 'success',
            'data': {
                sesionesCaja: {
                    items: sesionesCaja,
                    paginador: paginador
                }
            }
        }
        
        return res.json(data)

    }).catch((e) => {
        logger.log('error', e)
        return res.send("Error al obtener db")
    })
}

exports.reenviarVenta = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        api.checkConnection().then(async () => {
            let venta = await dbCliente.ventas.findOne({_id: req.params.id})
            let data = {
                api_key: req.query.api_key,
                venta: venta,
            }

            let opts = {
                path: '/ventas/editar-venta/', 
                data: data, 
                claveCliente: dbCliente.claveCliente
            }
            
            try{
                let resp = await api._post(opts)
                if (resp.status == "success") {
                    await dbCliente.ventas.update({_id: req.params.id}, {$set: {sincronizada: true}})
                }

                return res.json(resp)
            } catch(e) {
                return res.json({
                    status: 'error',
                    message: e || 'Error al validar ventas'
                })
            }
        }).catch(e => {
            return res.json({
                status: 'error',
                message: 'Es necesaria la conexión a internet para continuar.'
            })
        })
    }).catch((e) => {
        return res.send("Error al obtener db")
    })
}

exports.enviarVentasError = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        try {
            let productos = await dbCliente.productos.find({activo: false}, {'codigo': 1, 'descripcion': 1})
            return res.json(productos)
        } catch(e) {
            return res.send(e)
        }
    }).catch((e) => {
        return res.send("Error al obtener db")
    })
}

exports.shellAuth = async (req, res) => {
    let status = 'error'
    if (req.body.p === 'sandia') {
        status = 'success'
        process.env.SOPORTE = true
    }
    
    return res.json({status: status})
}

exports.shellLogout = async (req, res) => {
    delete process.env.SOPORTE
    return res.json("bye")
}

exports.shell = async (req, res) => {    
    let accesos = await db._api.find({})
    const _data = []
    let java = null;
    try{
        java = require('java');
    } catch(e){
        
    }

    let sandbox = {
        _db: db.get,
        helpers: helpers,
        request: request,
        moment: moment,
        java: java,
        pinpadInstance: process.pinpadInstance,
        env: process.env,
        edge: process.__edge,
        api: api,
        sincronizacion: require('./sincronizar'),
        _: (d) => { _data.push(d) },
        _ok: Object.keys
    }

    let ac = `
/*
    ${Object.keys(sandbox).join(', ')}
*/
module.exports = async (_r) => {
    try {
        let db = await _db("cliente")
        let p = await db.productos.findOne({})
        _(p) \n\n\n\n\n\n
        _r() // ejecuta el callback, NO BORRAR
     }catch(e) {
         _(String(e))
     }
}
`
    
    let cmd = `${ac}`

    if (helpers.isEnv('production') && !process.env.SOPORTE) {
        return res.render('shell/auth.html', {
            data: _data,
            cmd: cmd
        })
    }

    if (req.method == "POST") {

        const vm = new NodeVM({
            require: {
                external: true
            },
            sandbox: sandbox
        });

        try {
            cmd = req.body._q
            let functionInSandbox = vm.run(cmd);

            callbackFunc = function(result){
                
            }

            await functionInSandbox( callbackFunc )
        } catch(e) {
            _data.push(e)
        }

    }
    
    return res.render('shell/command.html', {
        data: _data,
        cmd: cmd
    })
}


exports.consultarTransaccionesPinpad = async (req, res) =>  {
	db._getDB(req.query.api_key).then(async (dbCliente) => {
        try {
        	let conf = await dbCliente.conf.findOne({})
            let pinpad = await helpers.getPinpadInstance(conf.pinpad)
            let fecha = moment().format("DD/MM/YYYY")
            let objects = await pinpad.consultarTransacciones({fecha: fecha})
            return res.json({
            	status: 'success',
            	objects: objects
            })
        } catch(e) {
            logger.log('error', e)
            return res.json({
            	status: 'error', 
            	message: e.mensaje ? e.mensaje : e.message
           	})
        }

    }).catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: e.message
        })
    })
}

exports.consultarTransaccionPinpad = async (req, res) =>  {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let referencia = req.params.referencia
        let conf = await dbCliente.conf.findOne({})
        try {
            let pinpad = await helpers.getPinpadInstance(conf.pinpad)
            let consulta = await pinpad.verificarTransaccion({referencia: referencia})
            consulta.transacciones = await dbCliente.transacciones_pp.cfind({referencia: referencia}).sort({fecha: -1}).limit(10).exec()
            return res.json(consulta)
        } catch(e) {
            logger.log('error', e)
            return res.json({status: 'error', mensaje: e.mensaje ? e.mensaje : e.message})
        }

    }).catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: String(e)
        })
    })
    
}

exports.solicitudTransaccionPinpad = async (req, res) =>  {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let solicitud = req.body.solicitud || ''
        let referencia = req.body.referencia
        let conf = await dbCliente.conf.findOne({})
        try {
            let pinpad = await helpers.getPinpadInstance(conf.pinpad)
            let resultadoSolicitud = {}
            let usuario = await dbCliente.usuarios.findOne({api_token: req.query.api_key})
            let monto = req.body.monto

            switch (solicitud.toLowerCase()) {
                case 'cancelacion':
                    resultadoSolicitud = await pinpad.cancelarTransaccion({referencia: referencia, monto: monto})
                    
                    if (resultadoSolicitud.status === 'success') {
                        try {
                            // cancelar en admintotal
                            let cancelacionAdmintotal = await helpers.cancelarTransaccionAdmintotal({
                                claveCliente: dbCliente.claveCliente,
                                api_key: req.query.api_key,
                                referencia: referencia,
                                importe: monto
                            })

                            if (cancelacionAdmintotal.status !== 'success') {
                                logger.log('error', {
                                    message: "Ocurrió un error al cancelar transacción en admintotal",
                                    cancelacion: resultadoSolicitud,
                                    cancelacionAt: cancelacionAdmintotal
                                })
                            }

                        } catch(e) {
                            logger.log('error', {
                                message: "Ocurrió un error al cancelar transacción en admintotal",
                                cancelacion: resultadoSolicitud,
                                e: e.message
                            })
                        }
                    }
                    break;

                case 'devolucion':
                    resultadoSolicitud = await pinpad.devolucionTransaccion({referencia: referencia, monto: monto})
                    break;

                default:
                    resultadoSolicitud = {
                        status: 'error',
                        mensaje: 'La solicitud especificada es inválida.'
                    }
                break;

            }

            let t = {
                tipoTransaccion: solicitud,
                integracion: pinpad.integracion,
                fecha: moment().toISOString(),
                resultado: resultadoSolicitud,
                referencia: referencia,
                usuario: {
                    id: usuario.id,
                    username: usuario.username,
                }
            }
            let doc = await dbCliente.transacciones_pp.insert(t)
            resultadoSolicitud.instance = doc
            resultadoSolicitud.transacciones = await dbCliente.transacciones_pp.cfind({referencia: referencia}).sort({fecha: -1}).limit(10).exec()
            return res.json(resultadoSolicitud)
            
        } catch(e){
            logger.log('error', e)
            return res.json({status: 'error', mensaje: e.message})
        }


    }).catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: String(e)
        })
    })
    
}

exports.eliminarDatos = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let hasta = moment().subtract(6, 'day').endOf('day')
        
        let ultimaVenta = await dbCliente.ventas.cfind({}).sort({fecha: -1}).limit(1).exec()
        let backupsBasePath = `${db.storagePath('backups')}/${dbCliente.claveCliente}/${hasta.format('DD-MM-YY')}`
        let ventasEliminadas = []
        
        hasta = hasta.toISOString()

        if (ultimaVenta.length) {
            ventasEliminadas = await helpers.respaldarDatos({
                dirBase: backupsBasePath,
                nombreArchivo: 'ventas.json',
                coleccion: dbCliente.ventas,
                filtro: {
                    _id: {$ne: ultimaVenta[0]._id},
                    fecha: {$lt: hasta},
                    sincronizada: true, 
                    error: {$exists: false}
                },
            })

            logger.log('info', `${ventasEliminadas} ventas han sido eliminadas.`)
        }

        // retiros
        let retirosEliminados = await helpers.respaldarDatos({
            dirBase: backupsBasePath,
            nombreArchivo: 'retiros.json',
            coleccion: dbCliente.retiros,
            filtro: {
                fecha: {$lt: hasta},
                sincronizado: true, 
                error: {$exists: false}
            },
        })
        logger.log('info', `${retirosEliminados} retiros han sido eliminados.`)

        // transacciones pinpad
        let transaccionesPPEliminados = await helpers.respaldarDatos({
            dirBase: backupsBasePath,
            nombreArchivo: '_tpp.json',
            coleccion: dbCliente.transacciones_pp,
            filtro: {
                fecha: {$lt: hasta}
            },
        })
        logger.log('info', `${transaccionesPPEliminados} transaccioens han sido eliminados.`)

        // sesiones_caja
        let sesionesCajaEliminados = await helpers.respaldarDatos({
            dirBase: backupsBasePath,
            nombreArchivo: 'sesiones_caja.json',
            coleccion: dbCliente.sesiones_caja,
            filtro: {
                'inicio.fecha': {$lt: hasta}
            },
        })
        logger.log('info', `${sesionesCajaEliminados} sesiones de caja han sido eliminados.`)

        // pedidos
        let pedidosEliminados = await helpers.respaldarDatos({
            dirBase: backupsBasePath,
            nombreArchivo: 'pedidos.json',
            coleccion: dbCliente.pedidos,
            filtro: {
                'fecha': {$lt: hasta}
            },
        })
        logger.log('info', `${pedidosEliminados} pedidos han sido eliminados.`)

        // recepciones_pago
        let recepcionesPagoEliminados = await helpers.respaldarDatos({
            dirBase: backupsBasePath,
            nombreArchivo: 'recepciones_pago.json',
            coleccion: dbCliente.recepciones_pago,
            filtro: {
                'fecha': {$lt: hasta}
            },
        })
        logger.log('info', `${recepcionesPagoEliminados} recepciones de pago han sido eliminados.`)

        return res.json({
            status: 'success',
            ventasEliminadas: ventasEliminadas,
            retirosEliminados: retirosEliminados,
            transaccionesPPEliminados: transaccionesPPEliminados,
            sesionesCajaEliminados: sesionesCajaEliminados,
            pedidosEliminados: pedidosEliminados,
        })

    }).catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: String(e)
        })
    })
}

exports.obtenerRespaldos = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        const {join} = require('path');
        const isDirectory = source => fs.lstatSync(source).isDirectory()
        const getDirectories = source =>
          fs.readdirSync(source).map(name => join(source, name)).filter(isDirectory)

        let backupsBasePath = `${db.storagePath('backups')}/${dbCliente.claveCliente}/`
        let respaldos = {}

        getDirectories(backupsBasePath).forEach(p => {
            let respaldo = {}
            let fecha = p.replace(backupsBasePath, '')
            respaldo.path = p
            respaldo.fecha = moment(fecha, 'DD-MM-YY')
            respaldo.archivos = fs.readdirSync(p)
            respaldos[fecha] = respaldo
        })

        return res.json({
            status: 'success',
            respaldos: respaldos
        })

    }).catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: String(e)
        })
    })
}

exports.cargarRespaldo = async (req, res) => {
    db._getDB(req.query.api_key).then(async (dbCliente) => {
        let coleccion = req.body.archivo.replace('.json', '')
        let archivo = req.body.archivo
        let fecha = moment(req.body.fecha).format('DD-MM-YY')

        let jsonFile = `${db.storagePath('backups')}/${dbCliente.claveCliente}/${fecha}/${archivo}`
        let data = JSON.parse(fs.readFileSync(jsonFile)) 
        let ids = []
        
        data.forEach(async (registro, index) => {
            ids.push(registro._id)
            data[index].__backup = true
        })

        await dbCliente[coleccion].remove({_id: {$in: ids}}, {multi: true})
        await dbCliente[coleccion].insert(data)

        return res.json({
            status: 'success',
            message: `${data.length} registros han sido cargados.`
        })

    }).catch((e) => {
        logger.log('error', e)
        return res.json({
            status: 'error',
            message: String(e)
        })
    })
}
