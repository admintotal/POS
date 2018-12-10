import * as actions from '../constants/ActionTypes';

export function abrirCaja(sesionCaja) {
  return {
    type: actions.PV_ABRIR_CAJA,
    sesionCaja: sesionCaja
  }
}

export function cerrarCaja(api_key, data) {
  return {
    type: actions.PV_CERRAR_CAJA,
    api_key: api_key,
    data: data
  }
}

export function retirarEfectivo(api_key, data) {
  return {
    type: actions.PV_RETIRAR_EFECTIVO,
    api_key: api_key,
    data: data
  }
}

export function requerirFactura() {
  return {
    type: actions.PV_REQUERIR_FACTURA,
  }
}

export function entregarDomicilio() {
  return {
    type: actions.PV_ENTREGAR_DOMICILIO,
  }
}

export function seleccionarUsoCFDI(uso_cfdi) {
  return {
    type: actions.PV_SELECCIONAR_USO_CFDI,
    uso_cfdi: uso_cfdi
  }
}

export function seleccionarCliente(cliente, productos=null) {
  return {
    type: actions.PV_SELECCIONAR_CLIENTE,
    cliente: cliente,
    productos: productos
  }
}

export function seleccionarProducto(producto) {
  return {
    type: actions.PV_SELECCIONAR_PRODUCTO,
    producto: producto
  }
}

export function eliminarProducto(producto, index) {
  return {
    type: actions.PV_ELIMINAR_PRODUCTO,
    producto: producto,
    index: index
  }
}

export function seleccionarDireccionEntrega(id) {
  return {
    type: actions.PV_SELECCIONAR_DIRECCION_ENTREGA,
    id: id
  }
}

export function seleccionarAlmacen(id) {
  return {
    type: actions.PV_SELECCIONAR_ALMACEN,
    id: id
  }
}

export function autocompleteProducto(api_key, q, almacen) {
  return {
    type: actions.PV_AUTOCOMPLETE_PRODUCTO,
    q: q,
    api_key: api_key,
    almacen: almacen
  }
}


export function autocompleteCliente(api_key, q) {
  return {
    type: actions.PV_AUTOCOMPLETE_CLIENTE,
    q: q,
    api_key: api_key
  }
}

export function guardarSesionCaja(api_key, data) {
  return {
    type: actions.PV_GUARDAR_SESION_CAJA,
    api_key: api_key,
    data: data
  }
}

export function guardarVenta(api_key, data) {
  return {
    type: actions.PV_GUARDAR_VENTA,
    api_key: api_key,
    data: data
  }
}

export function seleccionarMetodoPago(pago) {
  return {
    type: actions.PV_SELECCIONAR_METODO_PAGO,
    pago: pago
  }
}

export function actualizarProductoInline(producto, index) {
  return {
    type: actions.PV_ACTUALIZAR_PRODUCTO_INLINE,
    producto: producto,
    index: index
  }
}

export function infoExtraChange(extra, valor) {
  return {
    type: actions.PV_CHANGE_INFO_EXTRA,
    extra: extra,
    valor: valor
  }
}

export function setUmProducto(um, indexProducto) {
  return {
    type: actions.PV_SET_UM_PRODUCTO,
    um: um,
    index: indexProducto
  }
}

export function setVentaEspera(venta) {
  return {
    type: actions.PV_SET_VENTA_ESPERA,
    venta: venta
  }
}

export function cargarVentaEspera(ventaIndex) {
  return {
    type: actions.PV_CARGAR_VENTA_ESPERA,
    ventaIndex: ventaIndex
  }
}

export function eliminarVentaEspera(ventaIndex) {
  return {
    type: actions.PV_ELIMINAR_VENTA_ESPERA,
    ventaIndex: ventaIndex
  }
}

export function setClienteAc(cliente) {
  return {
    type: actions.PV_SET_CLIENTE_AC,
    cliente: cliente
  }
}

export function setProductosAc(objects) {
  return {
    type: actions.SET_PV_AUTOCOMPLETE_PRODUCTO,
    data: {objects: objects}
  }
}

export function setClientesAc(objects) {
  return {
    type: actions.SET_PV_AUTOCOMPLETE_CLIENTE,
    data: {objects: objects}
  }
}

export function setGuardando(guardando=true) {
  return {
    type: actions.PV_SET_GUARDANDO_VENTA,
    guardando: guardando
  }
}

export function seleccionarPinpad(pinpad) {
  return {
    type: actions.PV_SELECCIONAR_PINPAD,
    pinpad: pinpad
  }
}

export function nuevaVenta(cliente={}) {
  return {
    type: actions.PV_NUEVA_VENTA,
    cliente: cliente
  }
}


export function changeTipoPago(tipo, data={}) {
  return {
    type: actions.PV_CHANGE_TIPO_PAGO,
    tipo: tipo,
    data: data
  }
}

export function toggleOtraTerminalProsepago() {
  return {
    type: actions.PV_TOGGLE_OTRA_TERMINAL_PROSEPAGO,
  }
}


export function setProp(props) {
  return {
    type: actions.PV_SET_PROP,
    props: props
  }
}

export function concluirVenta(venta) {
  return {
    type: actions.PV_CONCLUIR_VENTA,
    venta: venta
  }
}
