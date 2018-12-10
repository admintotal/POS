import * as actions from '../constants/ActionTypes';


export function seleccionarAlmacen(id) {
  return {
    type: actions.RPF_SELECCIONAR_ALMACEN,
    id: id
  }
}

export function seleccionarCliente(cliente) {
  return {
    type: actions.RPF_SELECCIONAR_CLIENTE,
    cliente: cliente
  }
}

export function setClienteAc(cliente) {
  return {
    type: actions.RPF_SET_CLIENTE_AC,
    cliente: cliente
  }
}

export function setClientesAc(objects) {
  return {
    type: actions.RPF_SET_AUTOCOMPLETE_CLIENTES,
    data: {objects: objects}
  }
}

export function setDatosForm(datos={}) {
  return {
    type: actions.RPF_SET_DATOS_FORM,
    data: datos
  }
}

export function setCuenta(cuenta) {
  return {
    type: actions.RPF_SET_CUENTA,
    cuenta: cuenta
  }
}

export function toggleEnviarCorreo() {
  return {
    type: actions.RPF_TOGGLE_ENVIAR_CORREO
  }
}

export function setAlmacen(almacen) {
  return {
    type: actions.RPF_SET_ALMACEN,
    almacen: almacen
  }
}

export function setCajero(cajero) {
  return {
    type: actions.RPF_SET_CAJERO,
    cajero: cajero
  }
}

export function setImporte(importe) {
  return {
    type: actions.RPF_SET_IMPORTE,
    importe: importe
  }
}

export function setMoneda(moneda) {
  return {
    type: actions.RPF_SET_MONEDA,
    moneda: moneda
  }
}

export function setFecha(fecha) {
  return {
    type: actions.RPF_SET_FECHA,
    fecha: fecha
  }
}

export function setTipoAbono(tipo) {
  return {
    type: actions.RPF_SET_TIPO_ABONO,
    tipo: tipo
  }
}

export function setTipoPago(tipo) {
  return {
    type: actions.RPF_SET_TIPO_PAGO,
    tipo: tipo
  }
}

export function setAbono(abono) {
  return {
    type: actions.RPF_SET_ABONO,
    abono: abono
  }
}

export function setNoCheque(noCheque) {
  return {
    type: actions.RPF_SET_NO_CHEQUE,
    noCheque: noCheque
  }
}

export function setBanco(banco) {
  return {
    type: actions.RPF_SET_BANCO,
    banco: banco
  }
}

export function setComentarios(comentarios) {
  return {
    type: actions.RPF_SET_COMENTARIOS,
    comentarios: comentarios
  }
}


export function setAttr(data={}) {
  return {
    type: actions.RPF_SET_ATTR,
    data: data
  }
}

export function guardarPago(api_key, data={}) {
  return {
    type: actions.RPF_GUARDAR,
    api_key: api_key,
    data: data
  }
}

export function limpiarForm() {
  return {
    type: actions.RPF_LIMPIAR_FORM
  }
}
