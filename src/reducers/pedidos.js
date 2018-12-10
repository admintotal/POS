import * as actions from '../constants/ActionTypes';
import {precisionDecimales} from '../helpers';

type actionType = {
  type: string
};

const defaultState = () => {
    return {
        _id: null,
        ac_cliente: '',
        ac_producto: '',

        entregaDomicilio: false,
        direccionEntrega: null,

        productos: [],
        extra_fields: {},

        // totales
        total: 0,
        totalDescuento: 0,
        totalArticulos: 0,

        almacen: {},
        cliente: {},
        uso_cfdi: "P01",
    }
}

export default function pedidos(state={...defaultState()}, action: actionType) {
    let newState = {...state}

    const _get_totales = (state) => {
        let total = 0
        let totalDescuento = 0
        let totalArticulos = 0

        state.productos.map((p) => {
            totalArticulos += p.cantidad
            total += p.importe
            totalDescuento += (p.descuento * p.cantidad)
            return null
        })
        
        return {
            total: precisionDecimales(total),
            totalDescuento: precisionDecimales(totalDescuento),
            totalArticulos: totalArticulos,
            comision: 0
        }
    }

    const _get_producto_inline = (data, um) => {
        let obj = data.producto
        let cant = data.cantidad
        let descuento = 0
        let es_recarga = data.es_recarga

        if (um) {
            obj.um = um
        }

        let factorum = +obj.um.factor || 1
        let cantidadFactor = cant * factorum
        let precio_neto = precisionDecimales(obj.precio_neto) * factorum
        let precio_regular = precisionDecimales(precio_neto)
        
        if (obj.promociones) {
            obj.promociones.map((promo) => {
                if (cantidadFactor >= +(promo.cantidad)) {
                    precio_neto = precisionDecimales(promo.precio_neto) * factorum
                }
                return null
            })
        }

        descuento = (precio_regular - precio_neto)

        if (es_recarga) {
            precio_neto = precio_regular = precisionDecimales(obj.recarga_saldo_importe)
        }

        return {
            importe: Number(precio_neto) * cant,
            cantidad: cant,
            producto: obj,
            precio_regular: precio_regular,
            precio_neto: precio_neto,
            es_recarga: es_recarga,
            descuento: descuento,
            activo: obj.activo,
            promociones: obj.promociones,
        }
    }

	switch (action.type) {

        case actions.PEDIDOS_SELECCIONAR_CLIENTE:
            return { ...state, cliente: action.cliente, ac_cliente: action.cliente.razon_social }

    	case actions.PEDIDOS_ENTREGAR_DOMICILIO:
            return { ...state, entregaDomicilio: !state.entregaDomicilio }
    	
    	case actions.PEDIDOS_SELECCIONAR_DIRECCION_ENTREGA:
            let direccionEntrega = null;

            direccionEntrega = state.cliente.direcciones_entrega.find(el => {
                return el.id === Number(action.id || 0)
            }) 

            return { ...state, direccionEntrega: direccionEntrega }

        case actions.PEDIDOS_AUTOCOMPLETE_PRODUCTO:
            return {...state, ac_productos: action.data.objects}

        case actions.PEDIDOS_AUTOCOMPLETE_CLIENTE:
            return {...state, ac_clientes: action.data.objects}

        case actions.PEDIDOS_SELECCIONAR_PRODUCTO:
            let pi = _get_producto_inline(action.producto)
            newState.productos.unshift(pi)
            return {...newState, ..._get_totales(newState), ac_productos:[]}

        case actions.PEDIDOS_ELIMINAR_PRODUCTO:
            let index = action.index

            if (index > -1) {
                let prods = state.productos
                let productos = [
                    ...prods.slice(0, index),
                    ...prods.slice(index + 1),
                ]
                state.productos = productos
                return {...state, ..._get_totales(state)}
            }

            return {...state}

        case actions.PEDIDOS_SELECCIONAR_USO_CFDI:
            return {
                ...state, 
                uso_cfdi: action.uso_cfdi
            }

        case actions.PEDIDOS_ACTUALIZAR_PRODUCTO_INLINE:
            index = newState.productos.findIndex((e) => {
                return e.producto.id === action.producto.producto.id
            })

            if (index > -1) {
                let pi = _get_producto_inline(action.producto)
                newState.productos[index] = pi
                return {...newState, ..._get_totales(newState)}
            }

            return {...newState}


        case actions.PEDIDOS_CHANGE_INFO_EXTRA:
            let k = action.extra.nombre.replace('_field', '')
            let extra_fields  = {...state.extra_fields, [k]: action.valor}
            return {...state, extra_fields: extra_fields}

        case actions.PEDIDOS_NUEVO_PEDIDO:
            return {...defaultState()}

        case actions.PEDIDOS_SET_PEDIDO:
            return {...action.pedido, ac_cliente: action.pedido.cliente.razon_social}

        case actions.PEDIDOS_SET_CLIENTE_AC:
            return {...state, ac_cliente: action.cliente}

        case actions.PEDIDOS_SET_UM_PRODUCTO:
            let producto = state.productos[action.index]
            pi = _get_producto_inline(producto, action.um)
            newState.productos[action.index] = pi
            return {...state, ..._get_totales(newState)}

        default:
          return state;

    }

}