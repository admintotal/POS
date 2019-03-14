import * as actions from '../constants/ActionTypes';


export function entregarDomicilio(fecha_entrega={}) {
  return {
    type: actions.PEDIDOS_ENTREGAR_DOMICILIO,
    fecha_entrega: fecha_entrega
  }
}

export function seleccionarUsoCFDI(uso_cfdi) {
  return {
    type: actions.PEDIDOS_SELECCIONAR_USO_CFDI,
    uso_cfdi: uso_cfdi
  }
}

export function eliminarProducto(producto, index) {
  return {
    type: actions.PEDIDOS_ELIMINAR_PRODUCTO,
    producto: producto,
    index: index
  }
}

export function seleccionarDireccionEntrega(id) {
  return {
    type: actions.PEDIDOS_SELECCIONAR_DIRECCION_ENTREGA,
    id: id
  }
}

export function seleccionarAlmacen(id) {
  return {
    type: actions.PEDIDOS_SELECCIONAR_ALMACEN,
    id: id
  }
}

export function guardarPedido(api_key, data) {
  return {
    type: actions.PEDIDOS_GUARDAR_PEDIDO,
    api_key: api_key,
    data: data
  }
}

export function actualizarProductoInline(producto) {
  return {
    type: actions.PEDIDOS_ACTUALIZAR_PRODUCTO_INLINE,
    producto: producto
  }
}

export function infoExtraChange(extra, valor) {
  return {
    type: actions.PEDIDOS_CHANGE_INFO_EXTRA,
    extra: extra,
    valor: valor
  }
}


export function seleccionarProducto(producto) {
  return {
    type: actions.PEDIDOS_SELECCIONAR_PRODUCTO,
    producto: producto
  }
}

export function seleccionarCliente(cliente) {
  return {
    type: actions.PEDIDOS_SELECCIONAR_CLIENTE,
    cliente: cliente
  }
}


export function editarPedido(api_key, pedido) {
  return {
    type: actions.PEDIDOS_EDITAR_PEDIDO,
    api_key: api_key,
    pedido: pedido
  }
}

export function nuevoPedido() {
  return {
    type: actions.PEDIDOS_NUEVO_PEDIDO,
  }
}

export function setClienteAc(cliente) {
  return {
    type: actions.PEDIDOS_SET_CLIENTE_AC,
    cliente: cliente
  }
}

export function setUmProducto(um, indexProducto) {
  return {
    type: actions.PEDIDOS_SET_UM_PRODUCTO,
    um: um,
    index: indexProducto
  }
}