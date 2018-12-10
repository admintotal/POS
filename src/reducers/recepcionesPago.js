import * as actions from '../constants/ActionTypes';
import {precisionDecimales} from '../helpers';

type actionType = {
  type: string
};

const defaultState = () => {
    return {
        form: {
            _id: null,
            cliente: {},
            ac_cliente: '',
            cuenta: null,
            fecha: null,
            enviarCorreo: true,
            moneda: null,
            tipo_abono: null,
            tipo_pago: null,
            abonos: {},
            comentarios: '',
            importe: 0,

            noCheque: null,
            banco: null,
            cobrosPinpad: [],

            efectivo: {},
            cheque: {},
            transferencia: {},
            tarjeta: {},
            
            referencia: null,

            totalAplicado: 0,
            diferencia: 0,
            ac_clientes: [],
            facturas: [],
            bancos: [],
            cuentas: [],
            tipos_abonos: [],
            tipos_pagos: [],
            monedas: []
        }
    }
}

export default function recepcionesPago(state={...defaultState()}, action: actionType) {
    let form = {...state.form}
    let totalAplicado = 0
    let diferencia = 0

    let getTotalAplicado = (state) => {
        let totalAplicado = 0
        Object.values(state.abonos).forEach(a => {
            totalAplicado += +a.abono
        })

        return precisionDecimales(totalAplicado)
    }

	switch (action.type) {

        case actions.RPF_SET_CUENTA:
            form.cuenta = action.cuenta
            return {...state, form: {...state.form, ...form}}
        
        case actions.RPF_SET_AUTOCOMPLETE_CLIENTES:
            form.ac_clientes = action.data.objects
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_TOGGLE_ENVIAR_CORREO:
            form.enviarCorreo = !form.enviarCorreo
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_ALMACEN:
            form.almacen = action.almacen
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_CAJERO:
            form.cajero = action.cajero
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_FECHA:
            form.fecha = action.fecha
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_TIPO_ABONO:
            form.tipo_abono = action.tipo
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_TIPO_PAGO:
            form.tipo_pago = action.tipo
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_IMPORTE:
            form.importe = action.importe
            totalAplicado = getTotalAplicado(form)
            diferencia = form.importe - totalAplicado
            form.totalAplicado = totalAplicado
            form.diferencia = diferencia
            
            if (form.tipo_pago) {
                form.efectivo.monto = 0
                form.cheque.monto = 0
                form.transferencia.monto = 0
                form.tarjeta.monto = 0


                if (form.tipo_pago[0] === 1) {
                    form.efectivo.monto = form.importe
                }
                if (form.tipo_pago[0] === 2) {
                    form.cheque.monto = form.importe
                }
                if (form.tipo_pago[0] === 3) {
                    form.transferencia.monto = form.importe
                }
                if (form.tipo_pago[0] === 4) {
                    form.tarjeta.monto = form.importe
                }
            }

            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_MONEDA:
            form.moneda = action.moneda
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_BANCO:
            form.banco = action.banco
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_NO_CHEQUE:
            form.noCheque = action.noCheque
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_COMENTARIOS:
            form.comentarios = action.comentarios
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_LIMPIAR_FORM:
            var cleanState = {...defaultState()}

            return {
                ...cleanState, 
                form: {
                    ...cleanState.form, 
                    fecha: null,
                    monedas: state.form.monedas,
                    tipos_pagos: state.form.tipos_pagos,
                    tipos_abonos: state.form.tipos_abonos,
                }
            }

        case actions.RPF_SET_ABONO:
            if (+action.abono === 0) {
                delete form.abonos[action.abono.factura]
            } else {
                form.abonos[action.abono.factura] = action.abono
            }
            totalAplicado = getTotalAplicado(form)
            diferencia = form.importe - totalAplicado
            form.totalAplicado = totalAplicado
            form.diferencia = diferencia
            return {...state, form: {...state.form, ...form}}

        case actions.RPF_SET_ATTR:
            for(var k in action.data) {
                form[k] = action.data[k]
            }

            if (form.tipo_pago) {
                form.efectivo.monto = 0
                form.cheque.monto = 0
                form.transferencia.monto = 0
                form.tarjeta.monto = 0

                if (form.tipo_pago[0] === 1) {
                    form.efectivo.monto = form.importe
                }
                if (form.tipo_pago[0] === 2) {
                    form.cheque.monto = form.importe
                }
                if (form.tipo_pago[0] === 3) {
                    form.transferencia.monto = form.importe
                }
                if (form.tipo_pago[0] === 4) {
                    form.tarjeta.monto = form.importe
                }
            }

            return {...state, form: {...state.form, ...form}}


        case actions.RPF_SET_DATOS_FORM:
            if (action.data.cliente) {
                form.cliente = action.data.cliente
                form.ac_cliente = action.data.cliente.razon_social
            }

            if (action.data.facturas) {
                form.facturas = action.data.facturas
            }

            if (action.data.cuentas) {
                form.cuentas = action.data.cuentas
            }

            if (action.data.bancos) {
                form.bancos = action.data.bancos
            }

            if (action.data.tipos_pagos) {
                form.tipos_pagos = action.data.tipos_pagos
                if (form.tipos_pagos.length && !form.tipo_pago) {
                    form.tipo_pago = form.tipos_pagos[0]
                }
            }

            if (action.data.monedas) {
                form.monedas = action.data.monedas
                if (form.monedas.length && !form.moneda) {
                    form.moneda = form.monedas[0]
                }
            }

            if (action.data.tipos_abonos) {
                form.tipos_abonos = action.data.tipos_abonos
                if (form.tipos_abonos.length && !form.tipo_abono) {
                    form.tipo_abono = form.tipos_abonos[0]
                }
            }

            return {
                ...state,
                form: {
                    ...state.form, 
                    ...form
                }
            }

        default:
          return state;

    }

}