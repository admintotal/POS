import * as action from '../constants/ActionTypes';

export function toggleSidebar() {
  return {
    type: action.TOGGLE_SIDEBAR,
  };
}

export function submitLoginAction(data) {
  return {
    type: action.LOGIN,
    data
  };
}

export function logoutUsuario(claveCliente, api_key) {
  return {
    type: action.LOGOUT,
    claveCliente: claveCliente,
    api_key: api_key
  };
}

export function obtenerUltimaSesion() {
  return {
    type: action.OBTENER_ULTIMA_SESION
  };
}

export function obtenerConfiguracion(api_key) {
  return {
    type: action.OBTENER_CONFIGURACION,
    api_key: api_key
  }
}

export function cargando(mostrar=true, texto='Cargando') {
  return {
    type: action.CARGANDO,
    mostrar: mostrar
  };
}

export function obtenerAlmacenes(api_key) {
  return {
    type: action.OBTENER_ALMACENES,
    api_key: api_key
  };
}

export function obtenerSincronizaciones(api_key) {
  return {
    type: action.OBTENER_SINCRONIZACIONES,
    api_key: api_key
  };
}

export function setAlmacenes(almacenes) {
  return {
    type: action.SET_ALMACENES,
    almacenes: almacenes
  };
}

export function setSincronizaciones(sincronizaciones) {
  return {
    type: action.SET_SINCRONIZACIONES,
    sincronizaciones: sincronizaciones
  };
}

export function cancelarSincronizacion(api_key, sincronizacion) {
  return {
    type: action.CANCELAR_SINCRONIZACION,
    api_key:api_key,
    sincronizacion: sincronizacion
  };
}

export function sincronizarAlmacenes(api_key) {
  return {
    type: action.SINCRONIZAR_ALMACENES,
    api_key: api_key
  };
}

export function sincronizarVentas(api_key) {
  return {
    type: action.SINCRONIZAR_VENTAS,
    api_key: api_key
  };
}

export function sincronizarRetiros(api_key) {
  return {
    type: action.SINCRONIZAR_RETIROS,
    api_key: api_key
  };
}

export function sincronizarRecepcionesPago(api_key) {
  return {
    type: action.SINCRONIZAR_RECEPCIONES_PAGO,
    api_key: api_key
  };
}

export function sincronizarClientes(api_key, forzarDescarga=false) {
  return {
    type: action.SINCRONIZAR_CLIENTES,
    api_key: api_key,
    forzarDescarga: forzarDescarga
  };
}

export function sincronizarProductos(api_key, almacen, forzarDescarga=false) {
  return {
    type: action.SINCRONIZAR_PRODUCTOS,
    api_key: api_key,
    almacen: almacen,
    forzarDescarga: forzarDescarga
  };
}

export function mensajeError(error) {
  return {
    type: action.API_ERROR,
    error: error
  };
}

export function mensajeSuccess(mensaje) {
  return {
    type: action.MENSAJE_SUCCESS,
    mensaje: mensaje
  };
}

export function guardarConfiguracion(api_key, data) {
  return {
    type: action.GUARDAR_CONFIGURACION_ASYNC,
    api_key: api_key,
    data: data
  };
}

export function pollStart(api_key) {
  return {
    type: action.POLL_START,
    api_key: api_key
  }
}

export function pollStop() {
  return {
    type: action.POLL_STOP
  }
}

export function logoutOnClose() {
  return {
    type: action.LOGOUT_ON_CLOSE
  }
}

export function mensajeFlash(tipo, mensaje, timeout=3000) {
  return {
    type: action.MENSAJE_FLASH,
    tipo: tipo,
    mensaje: mensaje,
    timeout: timeout
  }
}


export function setActualizacionDisponible(actualizacionDisponible) {
  return {
    type: action.SET_ACTUALIZACION_DISPONIBLE,
    actualizacionDisponible: actualizacionDisponible
  }
}

export function setDescargarActualizacion(statusActualizacion) {
  return {
    type: action.SET_STATUS_ACTUALIZACION,
    statusActualizacion: statusActualizacion
  }
}

export function autocompleteProducto(completeActionType, api_key, q, almacen) {
  return {
    type: action.AUTOCOMPLETE_PRODUCTO,
    q: q,
    completeActionType: completeActionType, // que acción se dispara una vez teniendo los datos
    api_key: api_key,
    almacen: almacen
  }
}

export function autocompleteCliente(completeActionType, api_key, q) {
  return {
    type: action.AUTOCOMPLETE_CLIENTE,
    q: q,
    completeActionType: completeActionType, // que acción se dispara una vez teniendo los datos
    api_key: api_key
  }
}

export function mostrarAlerta(alerta) {
  return {
    type: action.MOSTRAR_ALERTA,
    mensaje: alerta.mensaje,
    titulo: alerta.titulo,
    aceptarTxt: alerta.aceptarTxt,
    handleAceptar: alerta.handleAceptar,
    handleCancelar: alerta.handleCancelar,
    cancelable: alerta.cancelable,
    cancelarTxt: alerta.cancelarTxt,
  }
}

export function ocultarAlerta() {
  return {
    type: action.OCULTAR_ALERTA,
    mensaje: null
  }
}

export function verVenta(venta, habilitarEnvioEdicion=false, eventos={}) {
  let {onReenviarVenta, onSincronizarVenta} = eventos
  return {
    type: action.VER_VENTA,
    venta: venta,
    habilitarEnvioEdicion: habilitarEnvioEdicion,
    onReenviarVenta: onReenviarVenta,
    onSincronizarVenta: onSincronizarVenta,
  };
}

export function verRecepcionPago(recepcionPago, eventos={}) {
  let {onSincronizar} = eventos
  console.log(onSincronizar)
  return {
    type: action.VER_RECEPCION_PAGO,
    recepcionPago: recepcionPago,
    onSincronizar: onSincronizar,
  };
}

export function cerrarVenta() {
  return {
    type: action.VER_VENTA,
    venta: null
  };
}

export function cerrarRecepcionPago() {
  return {
    type: action.VER_RECEPCION_PAGO,
    recepcionPago: null
  };
}