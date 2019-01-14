import { put, call, takeEvery, take, fork,  cancel } from 'redux-saga/effects';
import * as Api from '../api';
import * as Impresora from '../impresoras';
import {isEnv, kioskMode} from '../helpers';
import * as actions from '../constants/ActionTypes';

import AutoUpdater from 'nw-autoupdater';
import pjson from '../../package.json';
import formatCurrency from 'format-currency';
import { push } from 'react-router-redux';

let MINS_SINC = 3

function delay(millis) {  
    const promise = new Promise(resolve => {
        setTimeout(() => resolve(true), millis)
    });
    return promise;
}

export function* loginAsync(action) {
	try {
		yield put({type: actions.CARGANDO, mostrar: true});
		const loginData = yield call(Api.loginUser, action.data);
		yield put({type: actions.VERIFICAR_ACTUALIZACION_ASYNC});

		// yield put({type: actions.SINCRONIZAR_ALMACENES, api_key: loginData.usuario.api_token});
		// yield put({type: actions.SINCRONIZAR_CLIENTES, api_key: loginData.usuario.api_token});

		yield put({type: actions.POLL_START, api_key: loginData.usuario.api_token});
		yield put({type: actions.LOGOUT_ON_CLOSE});

		if (loginData.configuracion) {
			yield put({type: actions.SET_CONFIGURACION, data: loginData.configuracion});

			try {
				let folioStatus = yield call(Api.obtenerUltimoFolio, loginData.usuario.api_token, loginData.configuracion.numero_serie, 1)
				if (folioStatus.status !== 'success') {
					yield put({
						type: actions.MOSTRAR_ALERTA, 
						titulo: 'Hubo un problema al obtener el último folio', 
						mensaje: 'Asegurese de que el folio especificado en configuración es el correcto.'
					});
				}
			} catch(e) {
				yield put({
					type: actions.MOSTRAR_ALERTA, 
					titulo: 'Hubo un problema al obtener el último folio', 
					mensaje: 'Asegurese de que el folio especificado en configuración es el correcto.'
				});
			}

			if (loginData.configuracion.almacen) {
				try {
					yield put({type: actions.CANCELAR_SINCRONIZACION, api_key: loginData.usuario.api_token, sincronizacion: 'productos'})
					let forzarDescargaProds = loginData.configuracion.forzarDescargaProductosInicioSesion
					if (forzarDescargaProds === undefined) {
						forzarDescargaProds = true
					}

					yield call(Api.sincronizarProductos, loginData.usuario.api_token, loginData.configuracion.almacen.id, forzarDescargaProds)
				} catch(err) {
					
				}
				yield put({type: actions.POLL_PRODUCTOS_START, almacen: loginData.configuracion.almacen.id})
			}
		}

		if (loginData.usuario.sesion_caja) {
			yield put({type: actions.PV_ABRIR_CAJA, sesionCaja: loginData.usuario.sesion_caja})
		}

		if (loginData.siguienteFolio) {
			yield put({type: actions.PV_SIGUIENTE_FOLIO, siguienteFolio: loginData.siguienteFolio})
		}

		if (isEnv('production')) {
			yield call(kioskMode, true);
		}

		/*if (loginData.configuracion && loginData.configuracion.habilitarPinpad) {
			let pp = loginData.configuracion.pinpad
			if (pp.banco.toLowerCase() === 'santander') {
				yield call(maximize);
			}
		}*/
		
		yield put({type: actions.SET_SESSION, data: loginData.usuario});
		yield call(Api.limpiarDb, loginData.usuario.api_token);
		if (loginData.descargarClientes) {
			yield call(Api.sincronizarClientes, loginData.usuario.api_token, true);
		}
		yield put(push('/sincronizaciones'));

	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}

	yield put({type: actions.CARGANDO, mostrar: false});
}

export function* logoutAsync(action) {
	yield put({type: actions.CARGANDO, mostrar: true});
	try {
		let sincData = yield call(Api.sincronizarVentas, action.api_key);
		yield call(Api.sincronizarRetiros, action.api_key);
		
		if (sincData.status !== "error") {
			yield call(Api.logoutUser, action.claveCliente);
			yield put({type: actions.SET_SESSION, data: null});
			yield put({type: actions.POLL_STOP});
			yield put({type: actions.PV_BORRAR_DATOS});
			yield call(kioskMode, false);
		} else {
			yield put({
				type: actions.MOSTRAR_ALERTA, 
				titulo: 'Error al enviar las ventas', 
				mensaje: JSON.stringify(sincData.message || sincData)
			});
		}
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}

	yield put({type: actions.CARGANDO, mostrar: false});
}

export function* obtenerUltimaSesionAsync(action) {
	try {
		yield put({type: actions.CARGANDO, mostrar: true});
		let ultima_sesion = {}
		if (!isEnv('production')) {
			ultima_sesion = yield call(Api.obtenerUltimaSesion)
		}
		yield put({type: actions.SET_SESSION, data: ultima_sesion.session});

		if (ultima_sesion.session) {
			yield put({type: actions.LOGOUT_ON_CLOSE});
			yield put({type: actions.POLL_START, api_key: ultima_sesion.session.api_token});
			if (ultima_sesion.session.sesion_caja) {
				yield put({type: actions.PV_ABRIR_CAJA, sesionCaja: ultima_sesion.session.sesion_caja})
			}
		}

		if (ultima_sesion.data && ultima_sesion.data.configuracion) {
			yield put({type: actions.SET_CONFIGURACION, data: ultima_sesion.data});

			if (ultima_sesion.data.almacen) {
				yield put({type: actions.POLL_PRODUCTOS_START, almacen: ultima_sesion.data.almacen.id})
			}
		}

		if (ultima_sesion.siguienteFolio) {
			yield put({type: actions.PV_SIGUIENTE_FOLIO, siguienteFolio: ultima_sesion.siguienteFolio})
		}

		yield put(push('/inicio'));

	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
	
	yield put({type: actions.CARGANDO, mostrar: false});
}

export function* autocompleteClienteAsync(action) {
	try {
		const data = yield call(Api.autocompleteCliente, action.api_key, action.q);
		yield put({type: action.completeActionType, data: data});
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* autocompleteProductoAsync(action) {
	try {
		const data = yield call(Api.autocompleteProducto, action.api_key, action.q, action.almacen)
		yield put({type: action.completeActionType, data: data});
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* obtenerAlmacenesAsync(action) {
	try {
		const data = yield call(Api.obtenerAlmacenes, action.api_key);
		yield put({type: actions.SET_ALMACENES, data: data.objects});
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* obtenerConfiguracionAsync(action) {
	try {
		const data = yield call(Api.obtenerConfiguracion, action.api_key);
		yield put({type: actions.SET_CONFIGURACION, data: data});
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* obtenerSincronizacionesAsync(action) {
	try {
		const data = yield call(Api.obtenerSincronizaciones, action.api_key);
		yield put({type: actions.SET_SINCRONIZACIONES, data: data.objects});
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* cancelarSincronizacionAsync(action) {
	try {
		const data = yield call(Api.cancelarSincronizacion, action.api_key, action.sincronizacion);
		yield put({type: actions.SET_SINCRONIZACIONES, data: data.objects});
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}


export function* sincronizarAlmacenesAsync(action) {
	try {
		yield call(Api.sincronizarAlmacenes, action.api_key);
		yield call(Api.sincronizarAutorizaciones, action.api_key);
		let confData  = yield call(Api.sincronizarConfiguracion, action.api_key);
		yield put({type: actions.SET_CONFIGURACION, data: confData.configuracion});
		yield put({type: actions.OBTENER_SINCRONIZACIONES, api_key: action.api_key})
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* sincronizarClientesAsync(action) {
	try {
		yield call(Api.sincronizarClientes, action.api_key, action.forzarDescarga);
		yield put({type: actions.OBTENER_SINCRONIZACIONES, api_key: action.api_key})
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* sincronizarProductosAsync(action) {
	try {
		yield call(Api.sincronizarProductos, action.api_key, action.almacen, action.forzarDescarga);
		yield put({type: actions.OBTENER_SINCRONIZACIONES, api_key: action.api_key})
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* sincronizarRecepcionesPagoAsync(action) {
	try{
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'recepcionesPago', habilitado: false})
		let statusSinc = yield call(Api.sincronizarRecepcionesPago, action.api_key);
		
		yield call(delay, 1000);
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'recepcionesPago', habilitado: true})
		
		if (statusSinc.status === 'success') {
			if (statusSinc.message) {
				yield put({type: actions.MENSAJE_FLASH, tipo: 'success', mensaje: statusSinc.message});
			}
		} else {
			yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: statusSinc.message || `Hubo un error al sincronizar los retiros de efectivo.`});
		}
	} catch(error) {
		console.error(error.message)
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'recepcionesPago', habilitado: true})
	}
}

export function* sincronizarVentasAsync(action) {
	try{
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'ventas', habilitado: false})
		let statusSinc = yield call(Api.sincronizarVentas, action.api_key);
		
		yield call(delay, 1000);
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'ventas', habilitado: true})
		if (statusSinc.status === 'success') {
			if (statusSinc.message) {
				yield put({type: actions.MENSAJE_FLASH, tipo: 'success', mensaje: statusSinc.message});
			}
		} else {
			yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: statusSinc.message || `Hubo un error al sincronizar los retiros de efectivo.`});
		}
	} catch(error) {
		console.error(error.message)
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'ventas', habilitado: true})
	}
}

export function* sincronizarRetirosAsync(action) {
	try{
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'retirosEfectivo', habilitado: false})
		let statusSinc = yield call(Api.sincronizarRetiros, action.api_key);
		
		yield call(delay, 1000);
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'retirosEfectivo', habilitado: true})

		if (statusSinc.status === 'success') {
			if (statusSinc.message) {
				yield put({type: actions.MENSAJE_FLASH, tipo: 'success', mensaje: statusSinc.message});
			}
		} else {
			yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: statusSinc.message || `Hubo un error al sincronizar los retiros de efectivo.`});
		}
	} catch(error) {
		console.error(error.message)
		yield put({type: actions.SINC_SET_HABILITADO, sincronizacion: 'retirosEfectivo', habilitado: true})
	}
}

export function* guardarSesionCajaAsync(action) {
	try {
		let data = yield call(Api.guardarSesionCaja, action.api_key, action.data)
		if (data.sesion_caja) {
			yield put({type: actions.PV_ABRIR_CAJA, sesionCaja: data.sesion_caja})
			if (data.imprimir) {
				Impresora.imprimirFondoCaja('inicio', action.api_key, data.sesion_caja._id)
			}
		}
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* guardarVentaAsync(action) {
	yield put({type: actions.CARGANDO, mostrar: true});
	yield put({type: actions.PV_SET_GUARDANDO_VENTA, guardando: true});
	
	try {
		let data = yield call(Api.guardarVenta, action.api_key, action.data)
		if (data.imprimir) {
			if (data.venta.tarjeta.integracion && data.venta.tarjeta.integracion !== 'prosepago') {
				if (data.venta.tarjeta.datos.autorizacion) {
					Impresora.imprimirVoucher(data.venta._id, action.api_key, {tipo: 'comercio'})
					Impresora.imprimirVoucher(data.venta._id, action.api_key, {tipo: 'cliente'})
				}
			}

			Impresora.imprimirReciboVenta(data.venta._id, action.api_key, {
				url: data.venta.urlReciboVenta,
				conf: {
					marginLeft: data.impresora.marginLeft,
					paperWidth: data.impresora.paperWidth,
				}
			})
		}

		yield put({type: actions.CARGANDO, mostrar: false});
		yield put({type: actions.PV_NUEVA_VENTA, cliente: data.clienteDefault})

		let cambio = action.data.cambio
		let erroresRecargas = data.erroresRecargas.length
		let erroresServiciosLdi = data.erroresServiciosLdi.length

		if (erroresRecargas) {
			cambio = 0 // para que no muestre la alerta del cambio al cliente
			yield put({
				type: actions.MOSTRAR_ALERTA, 
				mensaje: `La venta ha sido guardada pero hubo problemas al solicitar ${erroresRecargas === 1 ? 'la recarga' : erroresRecargas + ' recargas'}.`
			})
		} else if (erroresServiciosLdi) {
			cambio = 0 // para que no muestre la alerta del cambio al cliente
			yield put({
				type: actions.MOSTRAR_ALERTA, 
				mensaje: `La venta ha sido guardada pero hubo problemas al solicitar ${erroresServiciosLdi === 1 ? 'el servicio' : erroresServiciosLdi + ' servicio'}.`
			})
		} else { 
			yield put({
				type: actions.MOSTRAR_ALERTA, 
				titulo: data.message,
				mensaje: `El cambio para el cliente es de: <b className="text-info">$${formatCurrency(cambio)}</b>`
			})
		}

		// siguiente folio 
		yield put({type: actions.PV_SIGUIENTE_FOLIO, siguienteFolio: data.venta.folio + 1})

	} catch(err) {
		console.error(err)
		yield put({type: actions.CARGANDO, mostrar: false});
		if (err.cobrosPinpad) {
			yield put({type: actions.PV_SET_COBROS_PINPAD, cobrosPinpad: err.cobrosPinpad});
		}
		let mensaje = err.message || JSON.stringify(err)
		try {
			if (('cobroPinpad' in err) && err.cobroPinpad) {
				mensaje = err.cobroPinpad.mensaje
			}
			if (err.transaccion && err.integracion && err.integracion !== 'santander') {
				Impresora.imprimirVoucherTransaccion(err.transaccion._id, action.api_key, 'cliente')
			}
		} catch(e) {
			console.error(e)
		}

		yield put({type: actions.MOSTRAR_ALERTA, mensaje: mensaje, titulo: 'Hubo un problema al guardar venta'});
		if (err.ventaGuardada) {
			yield put({type: actions.PV_NUEVA_VENTA, cliente: err.clienteDefault})
		}
	}

	yield put({type: actions.PV_SET_GUARDANDO_VENTA, guardando: false});
}

export function* guardarPedidoAsync(action) {
	try {
		let data = yield call(Api.guardarPedido, action.api_key, action.data)
		yield put({type: actions.MENSAJE_FLASH, tipo: 'success', mensaje: data.message});
		yield put({type: actions.PEDIDOS_NUEVO_PEDIDO});
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* cerrarSesionCajaAsync(action) {
	yield put({type: actions.CARGANDO, mostrar: true});
	
	try {
		let sincData = yield call(Api.sincronizarVentas, action.api_key);
		yield call(Api.sincronizarRetiros, action.api_key);
		
		if (!sincData.cierreCajaHabilitado) {
			yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: 'Asegurese de estar conectado a internet.'});
		} else {
			let data = yield call(Api.cerrarSesionCaja, action.api_key, action.data)
			yield put({type: actions.PV_LIMPIAR_SESION_CAJA})
			
			if (data.imprimir) {
				Impresora.imprimirFondoCaja('fin', action.api_key, data.sesion_caja._id)
			}
			yield put({type: actions.PV_NUEVA_VENTA})
		}
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
	
	yield put({type: actions.CARGANDO, mostrar: false});
}

export function* retirarEfectivoAsync(action) {
	try {
		let data = yield call(Api.retirarEfectivo, action.api_key, action.data)
		yield put({type: actions.MENSAJE_FLASH, tipo: 'success', mensaje: 'El retiro ha sido guardado correctamente'});
		if (data.imprimir) {
			Impresora.imprimirRetiroEfectivo(action.api_key, data.retiro._id)
		}
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}


export function* guardarConfiguracionAsync(action) {
	try {
		let data = yield call(Api.guardarConfiguracion, action.api_key, action.data)
		yield put({type: actions.SET_CONFIGURACION, data: data.configuracion});
		yield put({type: actions.MENSAJE_FLASH, tipo: 'success', mensaje: 'Los datos han sido guardados correctamente.'});
		
		yield put({type: actions.PV_SIGUIENTE_FOLIO, siguienteFolio: data.configuracion.folio_inicial})

		if (data.descargarProductos) {
			try {
				yield put({type: actions.CANCELAR_SINCRONIZACION, api_key: action.api_key, sincronizacion: 'productos'})
				yield call(Api.sincronizarProductos, action.api_key, data.configuracion.almacen.id, true)
			} catch(e) {
				
			}

			yield put({type: actions.POLL_PRODUCTOS_START, almacen: data.configuracion.almacen.id})
		}
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* editarPedidoAsync(action) {
	try {
		let data = yield call(Api.obtenerPedido, action.api_key, action.pedido)
		yield put({type: actions.PEDIDOS_SET_PEDIDO, pedido: data.pedido})
	} catch(err) {
		yield put({type: actions.MENSAJE_FLASH, tipo: 'error', mensaje: err});
	}
}

export function* pollAsync(api_key) {
	let interval  = MINS_SINC * (60 * 1000)
	try {
		while(true) {
		let confData = null
			try {
		        yield call(Api.sincronizarVentas, api_key);
			} catch (error) {
				// console.error(error)
		    }

		    try {
		        yield call(Api.sincronizarRetiros, api_key);
			} catch (error) {
				// console.error(error)
		    }

		    try {
		        yield call(Api.sincronizarRecepcionesPago, api_key);
			} catch (error) {
				// console.error(error)
		    }

		    try {
		        confData = yield call(Api.sincronizarConfiguracion, api_key);
			} catch (error) {
				// console.error(error)
		    }

		    try {
		        let sincAut = yield call(Api.sincronizarAutorizaciones, api_key);
		        yield put({ type: actions.SET_AUTORIZACIONES, autorizaciones: sincAut.autorizaciones })
			} catch (error) {
				// console.error(error)
		    }

		    try {
		        yield call(Api.sincronizarAlmacenes, api_key);
			} catch (error) {
				// console.error(error)
		    }

		    try {
		        yield call(Api.sincronizarClientes, api_key);
			} catch (error) {
				// console.error(error)
		    }

		    try {
		        yield call(Api.sincronizarFacturasNoTimbradas, api_key);
			} catch (error) {
				// console.error(error)
		    }

		    if (confData) {
			    try {
		        	yield put({type: actions.SET_CONFIGURACION, data: confData.configuracion});
				} catch (error) {
					// console.error(error)
			    }
		    }
		    
	        // yield call(Api.sincronizarPedidos, api_key);

	        yield call(delay, interval);
	        yield put({ type: actions.POLL_START, api_key: api_key })
	    }
	} catch (error) {
		console.error(error)
	    // yield put({ type: actions.POLL_START, api_key: api_key })
    }

}

export function* pollProductosAsync(api_key, almacen) {
	let interval  = MINS_SINC * (60 * 1000)
	try {
		while(true) {    
			try {
	        	yield call(Api.sincronizarProductos, api_key, almacen);
			} catch(error) {
				// console.error(error)
			}

	        yield call(delay, interval);
	        
	        yield put({ type: actions.POLL_PRODUCTOS_START, api_key: api_key, almacen: almacen})
	    }
	} catch (error) {
		console.error(error)
	    // yield put({ type: actions.POLL_START, api_key: api_key })
    }
}

function* watchPollData() {
	while (true) {
		const { api_key } = yield take(actions.POLL_START)
		let poll = yield fork(pollAsync, api_key)
		const { almacen } = yield take(actions.POLL_PRODUCTOS_START)
		let productosPoll = yield fork(pollProductosAsync, api_key, almacen)

		yield take(actions.POLL_STOP)
		yield cancel(poll)
		yield cancel(productosPoll)
	}
}

function* mensajeFlash(action) {
	try {
		let timeout = action.timeout || 3000
		let mensaje = typeof action.mensaje === "string" ? action.mensaje : String(action.mensaje.message || (action.mensaje || 'Hubo un error'))
		
		if (!isEnv('production')) {
			console.info(JSON.stringify(action))
		}

		if (action.tipo === 'success') {
			yield put({type: actions.MENSAJE_SUCCESS, mensaje: mensaje})
			yield delay(timeout)
			yield put({type: actions.MENSAJE_SUCCESS, mensaje: ''})
		}

		if (action.tipo === 'error') {
			yield put({type: actions.API_ERROR, error: mensaje})
			yield delay(timeout)
			yield put({type: actions.API_ERROR, error: ''})
		}

	} catch (e) {
		yield put({type: actions.API_ERROR, error: e})
	}
}

function* verificarActualizacion() {
	const f = async function () {
		let ad = false
		try {
	        const updater = new AutoUpdater(pjson)
	        const rManifest = await updater.readRemoteManifest()
	        let platforms = {'darwin': 'macos64', 'win32': 'win64', 'linux': 'linux64'}
	        let p = platforms[process.platform]
	        
	        if (Object.keys(rManifest.packages).indexOf(p) > -1) {
	        	const needsUpdate = await updater.checkNewVersion( rManifest )
	        	ad = needsUpdate
	        }
	    } catch (err) {
	        console.error(err.message)
	    }

	    return ad
    }
    
	let actualizacionDisponible = yield call(f)
	yield put({type: actions.SET_ACTUALIZACION_DISPONIBLE, actualizacionDisponible: actualizacionDisponible})
}

export default function* rootSaga() {
	yield takeEvery(actions.LOGIN, loginAsync);
	yield takeEvery(actions.LOGOUT, logoutAsync);
	yield takeEvery(actions.OBTENER_CONFIGURACION, obtenerConfiguracionAsync);
	yield takeEvery(actions.OBTENER_ULTIMA_SESION, obtenerUltimaSesionAsync);
	//yield takeEvery(actions.PV_AUTOCOMPLETE_CLIENTE, autocompleteClienteOldAsync);
	//yield takeEvery(actions.PV_AUTOCOMPLETE_PRODUCTO, autocompleteProductoOldAsync);
	yield takeEvery(actions.OBTENER_ALMACENES, obtenerAlmacenesAsync);
	yield takeEvery(actions.OBTENER_SINCRONIZACIONES, obtenerSincronizacionesAsync);
	yield takeEvery(actions.PV_GUARDAR_SESION_CAJA, guardarSesionCajaAsync);
	yield takeEvery(actions.PV_GUARDAR_VENTA, guardarVentaAsync);
	yield takeEvery(actions.PV_CERRAR_CAJA, cerrarSesionCajaAsync);
	yield takeEvery(actions.PV_RETIRAR_EFECTIVO, retirarEfectivoAsync);
	yield takeEvery(actions.GUARDAR_CONFIGURACION_ASYNC, guardarConfiguracionAsync);
	yield takeEvery(actions.MENSAJE_FLASH, mensajeFlash);
	yield takeEvery(actions.VERIFICAR_ACTUALIZACION_ASYNC, verificarActualizacion);

	yield takeEvery(actions.PEDIDOS_GUARDAR_PEDIDO, guardarPedidoAsync);
	yield takeEvery(actions.PEDIDOS_EDITAR_PEDIDO, editarPedidoAsync);

	/* autocompletes */
	yield takeEvery(actions.AUTOCOMPLETE_CLIENTE, autocompleteClienteAsync);
	yield takeEvery(actions.AUTOCOMPLETE_PRODUCTO, autocompleteProductoAsync);

	/* sincronizaciones */
	yield takeEvery(actions.SINCRONIZAR_ALMACENES, sincronizarAlmacenesAsync);
	yield takeEvery(actions.SINCRONIZAR_CLIENTES, sincronizarClientesAsync);
	yield takeEvery(actions.SINCRONIZAR_PRODUCTOS, sincronizarProductosAsync);
	yield takeEvery(actions.SINCRONIZAR_RECEPCIONES_PAGO, sincronizarRecepcionesPagoAsync);
	yield takeEvery(actions.SINCRONIZAR_VENTAS, sincronizarVentasAsync);
	yield takeEvery(actions.SINCRONIZAR_RETIROS, sincronizarRetirosAsync);
	yield takeEvery(actions.CANCELAR_SINCRONIZACION, cancelarSincronizacionAsync);
	
	yield watchPollData();
}
