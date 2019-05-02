const api = require('../services')
const db = require('../db')
const moment = require('moment')
const request = require('request')
const uniqid = require('uniqid')
const logger = require('../logger').logger
const helpers = require('../helpers')

const qsToObject = (qs) => {
	return JSON.parse('{"' + decodeURI(qs).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g,'":"') + '"}')
}

const habilitarSinc = (tipo, objs, dbCliente, habilitar=true) => {
	return new Promise(async (resolve, reject) => {
		try {
			let ids = []
			objs.map((o) => {
				if (o._id) {
					ids.push(o._id)
				}
			})

			if (habilitar) {
				await dbCliente[tipo].update({_id: {$in: ids}}, {$unset: {sincHabilitada: false}}, {multi: true})
			} else {
				await dbCliente[tipo].update({_id: {$in: ids}}, {$set: {sincHabilitada: false}}, {multi: true})
			}
			return resolve()
		} catch(e) {
			logger.log('error', e)
			return reject()
		}
	})
}

let sincronizando = {ventas: [], retiros: []}

function guardarClientes(clientes, claveCliente, cb) {
	let info = {actualizados: 0}
	db._get(claveCliente).then(function(dbCliente) {
		if (!clientes.length) {
			return cb(info)
		}
		let fecha_sincronizacion = moment().toISOString()
		clientes.forEach(async function(item, index){
			item.fecha_sincronizacion = fecha_sincronizacion
			await dbCliente.clientes.update({id: item.id}, {$set: item}, {upsert: true})
			if (index === (clientes.length - 1)) {
				return cb(info)
			}
			info.actualizados += 1
		})
	})
} 

function guardarAlmacenes(almacenes, claveCliente, cb) {
	let info = {actualizados: 0}
	db._get(claveCliente).then(function(dbCliente) {
		if (!almacenes.length) {
			return cb(info)
		}

		almacenes.forEach(async function(item, index){
			await dbCliente.almacenes.update({id: item.id}, {$set: item}, {upsert: true})
			if (index === (almacenes.length - 1)) {
				return cb(info)
			}
			info.actualizados += 1
		})
	})
} 

function guardarProductos(productos, claveCliente, cb) {
	let info = {actualizados: 0}
	db._get(claveCliente).then(function(dbCliente) {
		if (!productos.length) {
			return cb(info)
		}
		let fecha_sincronizacion = moment().toISOString()
		productos.forEach(async function(item, index){
			item.fecha_sincronizacion = fecha_sincronizacion
			await dbCliente.productos.update({id: item.id}, {$set: item}, {upsert: true})
			if (index === (productos.length - 1)) {
				return cb(info)
			}
			info.actualizados += 1
		})
	})
}

async function descargar(api_key, coleccion, options) {
	return new Promise((resolve, reject) => {
		api.checkConnection().then(() => {
			db._getDB(api_key).then(async (dbCliente) => {
				let doc = await dbCliente.conf.findOne({})
				let sincs = doc.sincronizaciones || {}
				let data = {}

				if (sincs[coleccion] && sincs[coleccion].en_proceso) {
					data = {status: 'error', message: 'Ya hay una sincronización en curso', nolog: 1}
					return reject(data)
				}


				if (sincs[coleccion]) {
					sincs[coleccion].en_proceso = true
				} else {
					sincs[coleccion] = {en_proceso: true, inicio: moment().toISOString()}
				}
				
				await dbCliente.conf.update({}, {$set:{sincronizaciones:sincs}})

				let ultima_sincronizacion = null
				let forzarDescarga = options.data.forzarDescarga  == 'true'
				
				if (! forzarDescarga ) {
					if (! sincs[coleccion].error ) {
						if (sincs[coleccion]) {
							ultima_sincronizacion = moment(sincs[coleccion].finalizado).toISOString()
						}
						
						if (ultima_sincronizacion) {
					    	options.data.ultima_sincronizacion = ultima_sincronizacion 
						}
					}
				}

			    // options.data.limit = 100
			    const iterator = async (opts, guardarColeccion) => {
			    	let conf = await dbCliente.conf.findOne({})
			    	let inicioDescarga = moment().toISOString()
			    	let resetSinc = (error) => {
			    		let upd = {}
		    			upd[`sincronizaciones.${coleccion}.total`] = 0
		    			upd[`sincronizaciones.${coleccion}.sincronizados`] = 0
		    			upd[`sincronizaciones.${coleccion}.en_proceso`] = false
		    			upd[`sincronizaciones.${coleccion}.finalizado`] = inicioDescarga
		    			if (error) {
		    				upd[`sincronizaciones.${coleccion}.error`] = error
		    			}
			    		return upd
			    	}


		    		if (! conf.sincronizaciones[coleccion].en_proceso ) {
		    			await dbCliente.conf.update({}, {$set: resetSinc()})
			    		logger.log('info', `Sincronización de ${coleccion} cancelada.`)
			    		return {status: 'error', message: 'El proceso ha sido cancelado'}
			    	}

					// timeout 20 segundos
					opts.timeout = 25000
					let conexion = false
			        try { conexion = await api.checkConnection() } catch(e) {}

			        if (!forzarDescarga && conf.sincronizaciones[coleccion].error) {
			        	// error guarda los parametros de la peticion en la que ocurrió el error
			        	let error_params = conf.sincronizaciones[coleccion].error
			        	error_params.data.api_key = opts.data.api_key
			        	opts = error_params
			        }

			        if (conexion) {
				    	api._get(opts).then(async (result) => {
				    		if (! result.objects ) {
				    			let u = resetSinc()
				    			u['error'] = true
				    			u['result'] = result
				    			u['opts'] = opts
				    			delete u['finalizado']
				    			await dbCliente.conf.update({}, {
				    				$set: u
				    			})
				    			// logger.log('error', {result:result, opts: opts})
				    			return
				    		}

				    		if (! result.objects.length ) {
				    			await dbCliente.conf.update({}, {
				    				$set: resetSinc(),
				    				$unset: {
				    					[`sincronizaciones.${coleccion}.error`]: 1
				    				}
				    			})
				    			logger.log('info', `Sincronización de ${coleccion} finzalizada.`)
				    			// helpers.mostrarNotificacion(`Sincronización de ${coleccion} finzalizada.`)
				    			return 
				    		}

							guardarColeccion(result.objects, conf.configuracion.general.clave, async (info) => {
								let total_sincronizados = result.meta.offset + result.meta.limit
								let u = {}
								u[`sincronizaciones.${coleccion}.sincronizados`] = total_sincronizados
								u[`sincronizaciones.${coleccion}.total`] = result.meta.total_count

					    		await dbCliente.conf.update({}, {
					    			$set: u,
					    			$unset: {
				    					[`sincronizaciones.${coleccion}.error`]: 1
				    				}
					    		})
								
								if (result.meta.next) {
					    			opts.data = qsToObject(result.meta.next.split('?')[1])
					    			if(ultima_sincronizacion) {
					    				opts.data.ultima_sincronizacion = ultima_sincronizacion
					    			}
					    			return iterator(opts, guardarColeccion)
					    		}

				    			await dbCliente.conf.update({}, {
				    				$set: resetSinc(), 
				    				$unset: {
				    					[`sincronizaciones.${coleccion}.error`]: 1
				    				}
				    			})
				    			logger.log('info', `Sincronización de ${coleccion} finzalizada.`)
							})
				    	})
				    	.catch(async (err) => {
				    		let u = resetSinc(opts)
			    			u['error'] = true
			    			u['opts'] = opts
			    			delete u['finalizado']
			    			await dbCliente.conf.update({}, {$set: u})
			    			helpers.mostrarNotificacion(`Ocurrió un error en la sincronización de ${coleccion}.`)
			    			logger.log('error', err)
			    			return reject(err)
				    	})
			        } else {
			    		let u = resetSinc()
		    			u['error'] = true
		    			u['opts'] = opts
		    			delete u['finalizado']
		    			await dbCliente.conf.update({}, {$set: u})
		    			helpers.mostrarNotificacion(`Problemas de conexión para realizar la sincronización de ${coleccion}.`)
		    			return reject({message: "Sin conexión a internet"})
			        }
			    }
				
			    logger.log('info', `Iniciando descarga de ${coleccion}`)
				let guardarColMap = {'clientes': guardarClientes,'productos': guardarProductos,'almacenes': guardarAlmacenes}
			    iterator(options, guardarColMap[coleccion])
			    return resolve({status: 'success', message: `Sincronización de ${coleccion} inciada.`})
			})
			.catch((err) => {
				logger.log('error', err)
				reject(err)
			})
		})
		.catch((err) => {
			reject({status: 'error', message: 'Es necesaria la conexión a internet para continuar.'})
		})
	})
}

exports.almacenes = function(req, res) {
	descargar(req.query.api_key, 'almacenes', {path:'/almacenes', data:req.query}).then((results) => {
		return res.json(results)
	})
	.catch((err) => {
		if (!err.nolog) {
			logger.log('error', err)
		}
		return res.json(err)
	})

}

exports.clientes = async function(req, res) {
	descargar(req.query.api_key, 'clientes', {path:'/clientes', data:req.query}).then((results) => {
		return res.json(results)
	})
	.catch((err) => {
		if (!err.nolog) {
			logger.log('error', err)
		}
		return res.json(err)
	})
}


exports.productos = function(req, res) {
	descargar(req.query.api_key, 'productos', {path:'/productos', data:req.query}).then((results) => {
		return res.json(results)
	})
	.catch((err) => {
		if (err && !err.nolog) {
			logger.log('error', err)
		}
		return res.json(err)
	})
}

const enviarPedidos = function(api_key, dbCliente, datos={}) {
	return new Promise(async (resolve, reject) => {
		try {
			let pedidos = datos.pedidos || []
			pedidos.map((pedido, index) => {
				pedido.cliente = pedido.cliente.id
				pedido.direccionEntrega = pedido.direccionEntrega ? pedido.direccionEntrega.id : null
				// pedido.numero_serie = numero_serie
				
				delete pedido['fecha_sincronizacion']

				pedido.productos.map((p, i) => {
					pedido.productos[i] = {
						cantidad: p.cantidad,
						descuento: p.descuento,
						numeroRecarga: p.numeroTelefonico,
						importe: p.importe,
						producto: {
							id: p.producto.id,
							codigo: p.producto.codigo,
							um: {id: p.producto.um.id, nombre: p.producto.um.nombre, factor: p.producto.um.factor},
						}
					}
				})

				pedidos[index] = pedido
			})

			data = {data: pedidos}
			data['api_key'] = api_key
			opts = {path: '/sincronizar/pedidos/', data: data, claveCliente: dbCliente.claveCliente}
			let resultado = await api._post(opts)
			return resolve(resultado)

		} catch(e) {
			logger.log('error', e)
			return reject(e)
		}
	})
}

const enviarRecepcionesPago = function(api_key, dbCliente, pagos=[], opciones={}) {
	return new Promise(async (resolve, reject) => {
		try	{
			let conf = await dbCliente.conf.findOne({})
			if (! ('marcarSincronizado' in opciones) ) {
				opciones.marcarSincronizado = true
			}

			if (! ('controlarSinc' in opciones) ) {
				opciones.controlarSinc = true
			}

			if (opciones.controlarSinc) {
				await habilitarSinc('recepciones_pago', pagos, dbCliente, false)
			}

			data = {data: pagos}
			data['api_key'] = api_key
			opts = {path: '/sincronizar/recepciones-pago/', data: data, claveCliente: conf.configuracion.general.clave}
			try{
				let resultado = await api._post(opts)
				if (opciones.marcarSincronizado) {
					await dbCliente.recepciones_pago.update({_id: {$in: Object.keys(resultado.guardados)}}, {$set: {sincronizado: true}}, {multi: true})
				}

				if (opciones.controlarSinc) {
					await habilitarSinc('recepciones_pago', pagos, dbCliente, true)
				}
				return resolve(resultado)
			} catch(err) {
				if (opciones.controlarSinc) {
					await habilitarSinc('recepciones_pago', pagos, dbCliente, true)
				}
				
				helpers.mostrarNotificacion(`Hubo un problema en la sincronización de la recepción de pago.`)
				return reject(err)
			}
		} catch(err) {
			logger.log('error', err)
			reject(err)
		}
	})
}

const enviarVentas = function(api_key, dbCliente, datos={}) {
	return new Promise(async (resolve, reject) => {
		try {
			let infoVentas = {}
			let conf = await dbCliente.conf.findOne({})
			let ventas = datos.ventas || []
			let retiros = datos.retiros || []
			let cierres = datos.cierres || []

			ventas.map((v) => {
				let minVenta = helpers.cloneObject(v)

				minVenta.cliente = minVenta.cliente.id
				minVenta.direccionEntrega = minVenta.direccionEntrega ? minVenta.direccionEntrega.id : null
				
				if (datos.numero_serie) {
					minVenta.numero_serie = datos.numero_serie
				}

				if (!minVenta.numero_serie) {
					minVenta.numero_serie = conf.numero_serie
				}


				if (v.tarjeta.cobros && v.tarjeta.cobros.length) {
					minVenta.cobrosPinpad = v.tarjeta.cobros
				}
				
				let __sesionCaja = helpers.cloneObject(minVenta['sesionCaja'])

				delete minVenta['sincronizada']
				delete minVenta['totalArticulos']
				delete minVenta['cambio']
				delete minVenta['sesionCaja']

				minVenta.productos.forEach((p, index) => {

					minVenta.productos[index] = {
						cantidad: p.cantidad,
						descuento: p.descuento, // promociones
						descuentoAutorizado: p.descuentoAutorizado, // descuento autorizado
						numeroRecarga: p.numeroTelefonico,
						servicio_ldi_referencia: p.producto.servicio_ldi_referencia,
						importe: p.importe,
						producto: {
							id: p.producto.id,
							codigo: p.producto.codigo,
							um: {id: p.producto.um.id, nombre: p.producto.um.nombre, factor: p.producto.um.factor},
						}
					}
				})

				
				let id = v.sesionCaja._id || uniqid();

				if (! (id in infoVentas) ) {
					infoVentas[id] = {
						__sesionCaja: __sesionCaja,
						sessionCaja: {
							cierre: {},
							almacen: {},
							cajero: {}
						},
						ventas: [minVenta]
					}
				} else {
					infoVentas[v.sesionCaja._id].ventas.push(minVenta)
				}

			})
			
			if (cierres.length) {
				cierres.map((c) => {
					if (! (c.inicio._id in infoVentas)) {
						infoVentas[c.inicio._id] = {
							sessionCaja: {
								cierre: c.fin,
								almacen: c.inicio.almacen,
								cajero: c.inicio.cajero
							}
						}
					}
				})
			}
				
			let proms = Object.keys(infoVentas).map(async (key) => {
				if ('ventas' in infoVentas[key]) {
					try{
						let sesion_caja = await dbCliente.sesiones_caja.findOne({'inicio._id': key})
						let d = infoVentas[key]
						let cierre

						if ( sesion_caja ) {
							cierre = sesion_caja.fin
							d.sessionCaja.fecha = sesion_caja.inicio.fecha
							d.sessionCaja.fondo = sesion_caja.inicio.totalFondo
							d.sessionCaja.cajero = {id:sesion_caja.inicio.cajero.id, username: sesion_caja.inicio.cajero.username}
							d.sessionCaja.almacen = {id:sesion_caja.inicio.almacen.id, codigo: sesion_caja.inicio.almacen.codigo}
							d.sessionCaja.denominaciones = sesion_caja.inicio.denominaciones
						} else {
							d.sessionCaja.fecha = d.__sesionCaja.fecha
							d.sessionCaja.fondo = d.__sesionCaja.totalFondo
							d.sessionCaja.cajero = {id:d.__sesionCaja.cajero.id, username: d.__sesionCaja.cajero.username}
							d.sessionCaja.almacen = {id:d.__sesionCaja.almacen.id, codigo: d.__sesionCaja.almacen.codigo}
						}
						
						d.retiros = []
						
						retiros.map((ret) => {
							let r = helpers.cloneObject(ret)
							if (r.sesion_caja._id === sesion_caja.inicio._id) {
								delete r['cajero']
								delete r['almacen']
								delete r['sesion_caja']
								d.retiros.push(r)
							}
						})

						
						if (cierre) {
							delete cierre['cajero']
							delete cierre['almacen']
						}

						d.sessionCaja.cierre = cierre
						return d
					} catch(e) {
						logger.log('error', e)
					}
				}
			})
			
			Promise.all(proms).then(async (data) => {
				data = {data: data}
				data['api_key'] = api_key
				opts = {path: '/sincronizar/ventas/', data: data, claveCliente: conf.configuracion.general.clave}
				try{
					let resultado = await api._post(opts)
					return resolve(resultado)
				} catch(err) {
					helpers.mostrarNotificacion(`Hubo un problema en la sincronización de ventas.`)
					return reject(err)
				}
			})
		} catch(e) {
			logger.log('error', e)
			return reject(e)
		}
	})
}

exports.enviarRetiros = async function(api_key, dbCliente, retiros, opciones={}) {
	return new Promise(async (resolve, reject) => {
		if (! ('marcarSincronizado' in opciones) ) {
			opciones.marcarSincronizado = true
		}

		if (! ('controlarSinc' in opciones) ) {
			opciones.controlarSinc = true
		}

		let retirosIds = []
		let proms = retiros.map(async (retiro, i) => {
			retirosIds.push(retiro._id)
			let s = await dbCliente.sesiones_caja.findOne({'inicio._id': retiro.sesion_caja._id})
			retiro.sesion_caja = s.inicio
			retiro.sesion_caja.cajero = retiro.sesion_caja.cajero.id
			retiro.sesion_caja.almacen = retiro.sesion_caja.almacen.id
			return retiro
		})

		if (opciones.controlarSinc) {
			await habilitarSinc('retiros', retiros, dbCliente, false)
		}
		
		Promise.all(proms).then(async (data) => {
			data = {data: data}
			data['retiros'] = retiros
			data['api_key'] = api_key

			opts = {path: '/sincronizar/retiros/', data: data, claveCliente: dbCliente.claveCliente}
			try{
				let resultado = await api._post(opts)
				if (opciones.marcarSincronizado) {
					await dbCliente.retiros.update({_id: {$in: Object.keys(resultado.guardados)}}, {$set: {sincronizado: true}}, {multi: true})
				}

				if (opciones.controlarSinc) {
					await habilitarSinc('retiros', retiros, dbCliente, true)
				}

				return resolve(resultado)
			} catch(err) {
				if (opciones.controlarSinc) {
					await habilitarSinc('retiros', retiros, dbCliente, true)
				}

				helpers.mostrarNotificacion(`Hubo un problema en la sincronización de ventas.`)
				return reject(err)
			}
		}).catch(async (err) => {
			if (opciones.controlarSinc) {
				await habilitarSinc('retiros', retiros, dbCliente, true)
			}

			helpers.mostrarNotificacion(`Hubo un problema en la sincronización de ventas.`)
			return reject(err)
		})

	})
}

exports.ventas = async function(req, res) {
	api.checkConnection().then(() => {
		return db._getDB(req.query.api_key).then(async (DB) => {
			let filtroObj = {
				sincronizada: false, 
				pendiente: false, 
				requiereFactura: false, 
				motivoError: { $exists: false }, 
				sincHabilitada: { $exists: false }
			}

			if (req.query.forzar && Boolean(req.query.forzar)) {
				filtroObj = {
					requiereFactura: false, 
					pendiente: false, 
					$or: [
		                {sincronizada: false},
		                {motivoError:  { $exists: true }}
		            ]
				}
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
			let ventas = await DB.ventas.find(filtroObj)

			// enviar maximo de ventas
			ventas = ventas.splice(0, 40)
			
			/*let retiros = await DB.retiros.find({
				sincronizado: false, 
				sincHabilitada: { $exists: false }
			}) || []*/

			let retiros = []

			let cierres = await DB.sesiones_caja.find({'sincronizado': false}) || []
			// let cierreCajaHabilitado = (await DB.ventas.find({sincronizada: false, requiereFactura: false, motivoError: { $exists: false }})).length === 0
			let cierreCajaHabilitado = true
			let responseObj = {status: 'success', cierreCajaHabilitado: cierreCajaHabilitado}
			
			if (! (ventas.length || retiros.length) ) {
				responseObj.message = 'Nada por sincronizar'
				return res.json(responseObj)
			}
			
			// bloqueo de sincronización de retiros y ventas
			await habilitarSinc('ventas', ventas, DB, false)
			await habilitarSinc('retiros', retiros, DB, false)
			let resultado = await enviarVentas(req.query.api_key, DB, {
				ventas: ventas,
				retiros: retiros,
				cierres: cierres,
			})
			await habilitarSinc('ventas', ventas, DB, true)
			await habilitarSinc('retiros', retiros, DB, true)

			if (! resultado ) { 
				responseObj.status = 'error'
				responseObj.message = 'Hubo un error al sincronizar con Admintotal.'
				throw responseObj
			}
			
			if (resultado.ventas && resultado.ventas.length) {
				await DB.ventas.update({_id: {$in: resultado.ventas}}, {$set: {sincronizada: true, timbrada: true}, $unset: {error: true, motivoError: true}}, {multi: true})
				if (resultado.no_timbradas.length) {
					await DB.ventas.update({_id: {$in: resultado.no_timbradas}}, {$set: {timbrada: false}}, {multi: true})
				}
			}

			if (resultado.retiros_guardados && resultado.retiros_guardados.length) {
				await DB.retiros.update({_id: {$in: resultado.retiros_guardados}}, {$set: {sincronizado: true}}, {multi: true})
			}
			
			if (resultado.cierres_guardados && resultado.cierres_guardados.length) {
				await DB.sesiones_caja.update({'fin._id': {$in: resultado.cierres_guardados}}, {$set: {sincronizado: true}}, {multi: true})
			}

			if (resultado.errores && Object.keys(resultado.errores).length) {
				for (let k in resultado.errores) {
					DB.ventas.update({_id: k}, {$set: {sincronizada: true, error: true, motivoError: resultado.errores[k]}})
				}
			}
			
			// let cierreCajaHabilitado = (await DB.ventas.find({sincronizada: false, requiereFactura: false, motivoError: { $exists: false }})).length === 0
			resultado = Object.assign(resultado, {cierreCajaHabilitado: cierreCajaHabilitado})
			
			if (resultado.ventas && resultado.ventas.length) {
				if (resultado.ventas.length == 1) {
					helpers.mostrarNotificacion(`Una venta ha sido sincronizado.`)
				} else {
					helpers.mostrarNotificacion(`${resultado.ventas.length} ventas se han sincronizado.`)
				}
			}

			return res.json(resultado)
		})
		.catch((err) =>{
			logger.log('error', err)
			return res.json(err)
		})
	})
	.catch((err) => {
		return res.json({status: 'error', message: 'Es necesaria la conexión a internet para continuar.'})
	})
}

exports.venta = async function(req, res) {
	api.checkConnection().then(() => {
		return db._getDB(req.query.api_key).then(async (DB) => {
			let ventas = await DB.ventas.find({_id: req.params.id, requiereFactura: false})
			// let cierreCajaHabilitado = (await DB.ventas.find({sincronizada: false, requiereFactura: false, motivoError: { $exists: false }})).length === 0
			let cierreCajaHabilitado = true
			let responseObj = {status: 'success', cierreCajaHabilitado: cierreCajaHabilitado}
									
			if (! (ventas.length) ) {
				responseObj.message = 'Nada por sincronizar.'
				return res.json(responseObj)
			}

			if (req.query.numero_serie && req.query.numero_serie != '') {
				await DB.ventas.update({_id: req.params.id}, {$set: {numero_serie: req.query.numero_serie}})
				ventas[0].numero_serie = req.query.numero_serie
			}

			// bloqueo de sincronización de ventas
			await habilitarSinc('ventas', ventas, DB, false)
			let resultado = await enviarVentas(req.query.api_key, DB, {
				ventas: ventas
			})
			await habilitarSinc('ventas', ventas, DB, true)
			
			if (! resultado ) { 
				responseObj.status = 'error'
				responseObj.message = 'Hubo un error al sincronizar con Admintotal.'
				throw responseObj
			}
			
			// actualizamos el status de las ventas
			if (resultado.ventas.length) {
				await DB.ventas.update({_id: {$in: resultado.ventas}}, {$set: {sincronizada: true, timbrada: true}, $unset: {motivoError: 1, error: 1}}, {multi: true})
				if (resultado.no_timbradas.length) {
					await DB.ventas.update({_id: {$in: resultado.no_timbradas}}, {$set: {timbrada: false}}, {multi: true})
				}
			}

			if (Object.keys(resultado.errores).length) {
				for (let k in resultado.errores) {
					DB.ventas.update({_id: k}, {$set: {error: true, motivoError: resultado.errores[k]}})
				}
			}
			
			resultado = Object.assign(resultado, {cierreCajaHabilitado: cierreCajaHabilitado})
			
			if (resultado.ventas.length) {
				if (resultado.ventas.length == 1) {
					helpers.mostrarNotificacion(`Una venta ha sido sincronizado.`)
				} else {
					helpers.mostrarNotificacion(`${resultado.ventas.length} ventas se han sincronizado.`)
				}
			}

			return res.json(resultado)
		})
		.catch((err) =>{
			logger.log('error', err)
			return res.json(err)
		})
	})
	.catch((err) => {
		logger.log('error', err)
		return res.json({status: 'error', message: 'Es necesaria la conexión a internet para continuar.'})
	})
}

exports.retiros = async function(req, res) {
	api.checkConnection().then(() => {
		return db._getDB(req.query.api_key).then(async (dbCliente) => {
			let retiros = await dbCliente.retiros.find({
				sincronizado: false, 
				sincHabilitada: { $exists: false }
			}) || []
			
			if (!retiros.length) {
				return res.json({status: 'success', message: 'Nada por sincronizar'})
			}

			let statusRetiros = await exports.enviarRetiros(req.query.api_key, dbCliente, retiros)
			statusRetiros.status = 'success'
			statusRetiros.message = `${Object.keys(statusRetiros.guardados).length} retiros han sido sincronizados.`
			return res.json(statusRetiros)
		})
		.catch((err) =>{
			logger.log('error', err)
			return res.json(err)
		})
	})
	.catch((err) => {
		logger.log('error', err)
		return res.json({status: 'error', message: 'Es necesaria la conexión a internet para continuar.'})
	})
}

exports.recepcionesPago = async function(req, res) {
	api.checkConnection().then(() => {
		return db._getDB(req.query.api_key).then(async (dbCliente) => {
			let recepciones_pago = await dbCliente.recepciones_pago.find({
				sincronizado: false, 
				sincHabilitada: { $exists: false }
			}) || []
			if (recepciones_pago.length) {
				let status = await exports.enviarRecepcionesPago(req.query.api_key, dbCliente, recepciones_pago)
				return res.json(status)
			}
			return res.json({status: 'success', message: 'Nada por sincronizar'})
		})
		.catch((err) =>{
			logger.log('error', err)
			return res.json(err)
		})
	})
	.catch((err) => {
		logger.log('error', err)
		return res.json({status: 'error', message: 'Es necesaria la conexión a internet para continuar.'})
	})
}
exports.facturasNoTimbradas = async function(req, res) {
	api.checkConnection().then(() => {
		return db._getDB(req.query.api_key).then(async (dbCliente) => {
			let facturas = await dbCliente.ventas.cfind({
				requiereFactura: true, 
				error: true,
				folio: {$gt: 0},
				id: {$gt: 0}
			}, {folio: 1, fecha: 1, total: 1, id: 1}).sort({folio: -1}).exec() || []

			if (facturas.length) {
				data = {facturas: facturas}
				data['api_key'] = req.query.api_key
				opts = {path: '/sincronizar/facturas-no-timbradas/', data: data, claveCliente: dbCliente.claveCliente}
				try {
					let resultado = await api._post(opts)
					resultado.facturasActualizadas = 0
					for(var id in resultado.data) {
						var statusFactura = resultado.data[id]
						var folio = +statusFactura.folio
						if (statusFactura.timbrada) {
							let updated = await dbCliente.ventas.update(
								{requiereFactura:true, id: +id, folio: folio}, 
								{$set: {timbrada: true}, $unset: {error: true, urlErrorTimbrado: true, motivoError: true}}
							)
							resultado.facturasActualizadas += updated
						}
					}

					return res.json(resultado)
				} catch(e) {
					logger.log('error', {
						message: 'Error al validar facturas no timbradas.',
						e: e
					})
				}
			}

			return res.json({status: 'success', message: 'Nada por sincronizar'})
		})
		.catch((err) =>{
			logger.log('error', err)
			return res.json(err)
		})
	})
	.catch((err) => {
		logger.log('error', err)
		return res.json({status: 'error', message: 'Es necesaria la conexión a internet para continuar.'})
	})
}

exports.pedidos = async function(req, res) {
	api.checkConnection().then(() => {
		return db._getDB(req.query.api_key).then(async (dbCliente) => {
			let pedidos = await dbCliente.pedidos.find({fecha_sincronizacion: null})
			let resultado = await enviarPedidos(req.query.api_key, dbCliente, {pedidos: pedidos})
			if (! resultado ) { 
				throw { message: 'Hubo un error al sincronizar con Admintotal.'}
			}
			await dbCliente.pedidos.update({_id: {$in: resultado.pedidos}}, {$set: {fecha_sincronizacion: moment().toISOString()}}, {multi: true})
			return res.json(resultado)
		})
		.catch((err) =>{
			logger.log('error', err)
			return res.json(err)
		})
	})
	.catch((err) => {
		logger.log('error', err)
		return res.json({status: 'error', message: 'Es necesaria la conexión a internet para continuar.'})
	})
}

exports.obtenerAutorizaciones = function(api_key, claveCliente, cb) {
	db._getDB(api_key).then((dbCliente) => {
		data = {api_key: api_key, limit: 100}
		opts = {path: '/autorizaciones', data: data, claveCliente: claveCliente}
		api._get(opts)
		.then((res) => { return cb(null, res)})
		.catch((err) => { cb(err, null)})
	})
	.catch((e) => {
		logger.log('error', e)
        return cb({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}

exports.configuracion = (req, res) => {
	api.checkConnection().then(() => {
		return db._getDB(req.query.api_key).then(async (dbCliente) => {
			let conf = await dbCliente.conf.findOne({})
			data = {api_key: req.query.api_key}
			opts = {path: '/sincronizar/configuracion', data: data, claveCliente: conf.configuracion.general.clave}
			api._get(opts)
			.then(async (configuracion) => { 
				if (configuracion.status == 'success') {
					await dbCliente.conf.update({}, {$set: {configuracion: configuracion.data}})
				}
				return res.json({status: 'success', configuracion: await dbCliente.conf.findOne({})})
			})
			.catch((err) => { return res.json(err) })
		})
		.catch((err) => {
			return res.json(err)
		})
	})
	.catch((err) => {
		return res.json({status: 'error', message: 'Es necesaria la conexión a internet para continuar.'})
	})
}

exports.autorizaciones = (req, res) => {
	return db._getDB(req.query.api_key).then(async (DB) => {
		let cg = (await DB.conf.findOne({})).configuracion.general
		let usuario = await DB.usuarios.findOne({api_token: req.query.api_key})
        let au = null
		return exports.obtenerAutorizaciones(req.query.api_key, cg.clave, async (err, data) => {
            if (!err) {
            	let autorizacionesValidas = []
                data.objects.forEach(async (a) => {
                    if (usuario && (usuario.id == a.responsable)) {
                    	au = helpers.cloneObject(a)
                    }

                    await DB.autorizaciones.update({responsable: a.responsable}, {$set: a}, {upsert: true})
                    autorizacionesValidas.push(a.responsable)
                })
                
                await DB.autorizaciones.remove({responsable: {$nin: autorizacionesValidas}}, {multi: true})

                return res.json({
					status: 'success', 
					message: `${data.objects.length} autorizaciones han sido guardadas.`,
					autorizaciones: au
				})
            }

            logger.log('error', err)
            return res.json(err)
        })
	})
	.catch((err) =>{
		return res.json(err)
	})
}

exports.cancelarSincronizacion = function(req, res) {
	return db._getDB(req.query.api_key).then(async (dbCliente) => {
		let conf = await dbCliente.conf.findOne({})
		let sincronizaciones = Object.assign({}, conf.sincronizaciones)
		let key = [req.params.key]
		sincronizaciones[key].en_proceso = false
		sincronizaciones[key].total = 0
		sincronizaciones[key].sincronizados = 0
		delete sincronizaciones[key].error
		await dbCliente.conf.update({}, {$set: {sincronizaciones: sincronizaciones}})
		return res.json({
			status: 'success',
			objects: sincronizaciones
		})
	})
	.catch(() => {
        return res.json({
            status: 'error',
            message: 'El token especificado es inválido'
        })
    })
}



exports.enviarPedidos = enviarPedidos
exports.enviarVentas = enviarVentas
exports.habilitarSinc = habilitarSinc
exports.enviarRecepcionesPago = enviarRecepcionesPago