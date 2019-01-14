import axios from 'axios';
import dns from 'dns';
import {serializeUri} from './helpers';

export const BASE_API_URL = 'http://localhost:3131/api'

export const checkInternetConnection = () => {
    return new Promise((resolve, reject) => {
        return dns.lookup('google.com', (err) => {
            if (err && err.code === "ENOTFOUND") {
                reject()
            } else {
                resolve()
            }
        })
    }) 
}

export const loginUser = async (data) => {
	return axios.post(`${BASE_API_URL}/login`, data)
	.then(function (response) {
		if (response.data.status === 'success') {
			return response.data
		}
		throw response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const logoutUser = (claveCliente) => {
	return axios.get(`${BASE_API_URL}/logout?claveCliente=${claveCliente}`)
	.then(function (response) {
		if (response.data.status === 'success') {
			return response.data
		}
		throw response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerUltimaSesion = () => {
	return axios.get(`${BASE_API_URL}/`)
	.then(function (response) {
		if (response.data.status === 'success') {
			return response.data
		}
		throw response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const limpiarDb = (api_key) => {
	return axios.get(`${BASE_API_URL}/eliminar-datos?api_key=${api_key}`)
	.then(function (response) {
		return response.data
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerConfiguracion = (api_key) => {
	return axios.get(`${BASE_API_URL}/configuracion?api_key=${api_key}`)
	.then(function (response) {
		return response.data
	})
	.catch(function (error) {
		throw error
	});
}

export const consultarTransaccionPinpad = (api_key, referencia) => {
	return axios.get(`${BASE_API_URL}/consultas/transaccion-pinpad/${referencia}?api_key=${api_key}`)
	.then(function (response) {
		return response.data
	})
	.catch(function (error) {
		throw error
	});
}

export const solicitudTransaccionPinpad = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/consultas/solicitud-transaccion-pinpad?api_key=${api_key}`, data)
	.then(function (response) {
		return response.data
	})
	.catch(function (error) {
		throw error
	});
}

export const getSesionCajaDetalle = (api_key, id) => {
	return axios.get(`${BASE_API_URL}/sesion-caja-detalles/${id}?api_key=${api_key}`)
	.then(function (response) {
		return response.data
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerAutorizaciones = (api_key) => {
	return axios.get(`${BASE_API_URL}/autorizaciones?api_key=${api_key}`)
	.then(function (response) {
		return response.data
	})
	.catch(function (error) {
		throw error
	});
}

export const autocompleteCliente = (api_key, q) => {
	return axios.get(`${BASE_API_URL}/clientes?q=${q}&api_key=${api_key}&limit=25`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const getDashboard = (api_key) => {
	return axios.get(`${BASE_API_URL}/dashboard?api_key=${api_key}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}

		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const getCliente = (api_key, id, porCodigo=false, productos=[]) => {
	return axios.get(`${BASE_API_URL}/clientes/${id}?api_key=${api_key}&porCodigo=${porCodigo}&productos=${productos}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}

		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const autocompleteProducto = (api_key, q, almacen, limit='25') => {
	return axios.get(`${BASE_API_URL}/productos?q=${q}&api_key=${api_key}&limit=${limit}&almacen=${almacen}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const getProducto = (api_key, id, porCodigo=false, cacheProds=[], cliente=null) => {
	let url = `${BASE_API_URL}/productos/${id}?api_key=${api_key}&cantidadBascula=1&porCodigo=${porCodigo}&cacheIds=${cacheProds.join(',')}&cliente=${cliente}`
	return axios.get(url)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}

		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerAlmacenes = (api_key) => {
	return axios.get(`${BASE_API_URL}/almacenes?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerSincronizaciones = (api_key) => {
	return axios.get(`${BASE_API_URL}/sincronizaciones?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerPuertosSeriales = (api_key) => {
	return axios.get(`${BASE_API_URL}/puertos-seriales?api_key=${api_key}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}

		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const cancelarSincronizacion = (api_key, sincronizacion) => {
	return axios.get(`${BASE_API_URL}/sincronizaciones/cancelar/${sincronizacion}?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerUltimoFolio = (api_key, serie, actualizar=0) => {
	return axios.get(`${BASE_API_URL}/obtener-ultimo-folio/${serie}?api_key=${api_key}&actualizar=${actualizar}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}


export const sincronizarAlmacenes = (api_key) => {
	return axios.get(`${BASE_API_URL}/sincronizar/almacenes?api_key=${api_key}&limit=100`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}

		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}


export const sincronizarClientes = (api_key, forzarDescarga=false) => {
	return axios.get(`${BASE_API_URL}/sincronizar/clientes?api_key=${api_key}&limit=100&forzarDescarga=${forzarDescarga}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const eliminarRegistros = (api_key, tipo) => {
	return axios.get(`${BASE_API_URL}/eliminar-registros-sincronizados/${tipo}?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const exportarVentasConError = (api_key) => {
	return axios.get(`${BASE_API_URL}/exportar/ventas-error?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarVentas = (api_key, opts={}) => {
	if (opts.desde) {
		opts.desde = opts.desde.toISOString()
	}

	if (opts.hasta) {
		opts.hasta = opts.hasta.toISOString()
	}

	if (('desde' in opts) && !opts.desde) {
		delete opts.desde
	}

	if (('hasta' in opts) && !opts.hasta) {
		delete opts.hasta
	}
	
	return axios.get(`${BASE_API_URL}/sincronizar/ventas?api_key=${api_key}&${serializeUri(opts)}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarRetiros = (api_key) => {
	return axios.get(`${BASE_API_URL}/sincronizar/retiros?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarRecepcionesPago = (api_key) => {
	return axios.get(`${BASE_API_URL}/sincronizar/recepciones-pago?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarVenta = (api_key, id, opts={}) => {
	return axios.get(`${BASE_API_URL}/sincronizar/ventas/${id}?api_key=${api_key}&numero_serie=${opts.numero_serie || ''}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarPago = (api_key, id, opts={}) => {
	return axios.get(`${BASE_API_URL}/pagos/sincronizar-pago/${id}?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarPedidos = (api_key) => {
	return axios.get(`${BASE_API_URL}/sincronizar/pedidos?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarConfiguracion = (api_key) => {
	return axios.get(`${BASE_API_URL}/sincronizar/configuracion?api_key=${api_key}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarFacturasNoTimbradas = (api_key) => {
	return axios.get(`${BASE_API_URL}/sincronizar/facturas-no-timbradas?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const sincronizarAutorizaciones = (api_key) => {
	return axios.get(`${BASE_API_URL}/sincronizar/autorizaciones?api_key=${api_key}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}


export const sincronizarProductos = (api_key, almacen, forzarDescarga=false) => {
	return axios.get(`${BASE_API_URL}/sincronizar/productos?api_key=${api_key}&limit=100&almacen=${almacen}&forzarDescarga=${forzarDescarga}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}


export const validarVentasAt = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/validar-ventas/?api_key=${api_key}`, data)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const guardarSesionCaja = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/guardar-sesion-caja/?api_key=${api_key}`, data)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const cerrarSesionCaja = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/cerrar-sesion-caja/?api_key=${api_key}`, data)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const retirarEfectivo = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/retirar-efectivo/?api_key=${api_key}`, data)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const guardarVenta = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/guardar-venta/?api_key=${api_key}`, data)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerInfoTarjeta = (api_key, data={}) => {
	return axios.get(`${BASE_API_URL}/obtener-info-tarjeta/?api_key=${api_key}&monto=${data.monto || 0}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const cancelarOperacionTarjeta = (api_key, data) => {
	return axios.get(`${BASE_API_URL}/cancelar-operacion-tarjeta/?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const cobrarVentaTarjeta = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/cobrar-venta-tarjeta/?api_key=${api_key}`, data)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const guardarRecepcionPago = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/pagos/guardar-pago?api_key=${api_key}`, data)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const guardarPedido = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/guardar-pedido/?api_key=${api_key}`, data)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerVenta = (api_key, id) => {
	return new Promise((resolve, reject) => {
		return axios.get(`${BASE_API_URL}/ventas/${id}?api_key=${api_key}`)
		.then(function (response) {			
			return resolve(response.data);
		})
		.catch(function (error) {
			return reject(error)
		});
	})
}

export const obtenerVentas = (api_key, opts={}, promise=false) => {
	if (opts.desde) {
		opts.desde = opts.desde.toISOString()
	} else {
		delete opts.desde
	}

	if (opts.hasta) {
		opts.hasta = opts.hasta.toISOString()
	} else {
		delete opts.hasta
	}

	if (promise) {
		return new Promise((resolve, reject) => {
			return axios.get(`${BASE_API_URL}/ventas?api_key=${api_key}&${serializeUri(opts)}`)
			.then(function (response) {
				if (response.data.status !== 'success') {
					return reject(response.data);
				}
				
				return resolve(response.data);
			})
			.catch(function (error) {
				return reject(error)
			});
		})

	}
	return axios.get(`${BASE_API_URL}/ventas?api_key=${api_key}&${serializeUri(opts)}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerRecepcionesPago = (api_key, opts={}, promise=false) => {
	if (opts.desde) {
		opts.desde = opts.desde.toISOString()
	}

	if (opts.hasta) {
		opts.hasta = opts.hasta.toISOString()
	}

	if (promise) {
		return new Promise((resolve, reject) => {
			return axios.get(`${BASE_API_URL}/pagos?api_key=${api_key}&${serializeUri(opts)}`)
			.then(function (response) {
				if (response.data.status !== 'success') {
					return reject(response.data);
				}
				
				return resolve(response.data);
			})
			.catch(function (error) {
				return reject(error)
			});
		})

	}
	return axios.get(`${BASE_API_URL}/pagos?api_key=${api_key}&${serializeUri(opts)}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerPedidos = (api_key, usuario, limit=25, promise=false) => {
	if (promise) {
		return new Promise((resolve, reject) => {
			return axios.get(`${BASE_API_URL}/pedidos?api_key=${api_key}&limit=${limit}&usuario=${usuario}`)
			.then(function (response) {
				if (response.data.status !== 'success') {
					return reject(response.data);
				}
				
				return resolve(response.data);
			})
			.catch(function (error) {
				return reject(error)
			});
		})

	}
	
	return axios.get(`${BASE_API_URL}/pedidos?api_key=${api_key}&limit=${limit}&usuario=${usuario}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerPedido = (api_key, id, promise=false) => {
	if (promise) {
		return new Promise((resolve, reject) => {
			return axios.get(`${BASE_API_URL}/pedidos/${id}?api_key=${api_key}`)
			.then(function (response) {
				if (response.data.status !== 'success') {
					return reject(response.data);
				}
				
				return resolve(response.data);
			})
			.catch(function (error) {
				return reject(error)
			});
		})

	}
	
	return axios.get(`${BASE_API_URL}/pedidos/${id}?api_key=${api_key}`)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const validarAutorizacion = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/validar-autorizacion/?api_key=${api_key}`, data)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const guardarConfiguracion = (api_key, data) => {
	return axios.post(`${BASE_API_URL}/guardar-configuracion?api_key=${api_key}`, data)
	.then(function (response) {
		if (response.data.status !== 'success') {
			throw response.data;
		}
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const inicializarPinpad = (api_key) => {
	return axios.get(`${BASE_API_URL}/inicializar-pinpad?api_key=${api_key}`)
	.then(function (response) {
		return response.data;
	})
	.catch(function (error) {
		throw error
	});
}

export const reenviarVenta = (api_key, id) => {
	return axios.get(`${BASE_API_URL}/reenviar-venta/${id}?api_key=${api_key}`)
	.then(function (response) {
		return response.data
	})
	.catch(function (error) {
		throw error
	});
}

export const obtenerDatosFormPago = (api_key, data={}) => {
	return axios.get(`${BASE_API_URL}/pagos/obtener-datos-form?api_key=${api_key}&cliente=${data.cliente||''}&almacen=${data.almacen||''}`)
	.then(function (response) {
		return response.data
	})
	.catch(function (error) {
		throw error
	});
}