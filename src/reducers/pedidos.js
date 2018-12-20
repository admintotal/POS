import * as actions from '../constants/ActionTypes';
import {getProductoInline, getStateTotales} from '../helpers';

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
            let pi = getProductoInline(action.producto)
            newState.productos.unshift(pi)
            return {...newState, ...getStateTotales(newState), ac_productos:[]}

        case actions.PEDIDOS_ELIMINAR_PRODUCTO:
            let index = action.index

            if (index > -1) {
                let prods = state.productos
                let productos = [
                    ...prods.slice(0, index),
                    ...prods.slice(index + 1),
                ]
                state.productos = productos
                return {...state, ...getStateTotales(state)}
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
                let pi = getProductoInline(action.producto)
                newState.productos[index] = pi
                return {...newState, ...getStateTotales(newState)}
            }

            return {...newState}


        case actions.PEDIDOS_CHANGE_INFO_EXTRA:
            let k = action.extra.nombre.replace('_field', '')
            let extra_fields  = {...state.extra_fields, [k]: action.valor}
            return {...state, extra_fields: extra_fields}

        case actions.PEDIDOS_NUEVO_PEDIDO:
            return {...defaultState()}

        case actions.PEDIDOS_SET_PEDIDO:
            action.pedido.productos.forEach((p, i) => {
                action.pedido.productos[i] = getProductoInline(action.pedido.productos[i])
            })

            return {...action.pedido, ...getStateTotales(action.pedido), ac_cliente: action.pedido.cliente.razon_social}

        case actions.PEDIDOS_SET_CLIENTE_AC:
            return {...state, ac_cliente: action.cliente}

        case actions.PEDIDOS_SET_UM_PRODUCTO:
            let producto = state.productos[action.index]
            pi = getProductoInline(producto, action.um)
            newState.productos[action.index] = pi
            return {...state, ...getStateTotales(newState)}

        default:
          return state;

    }

}