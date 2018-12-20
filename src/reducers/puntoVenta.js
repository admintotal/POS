import * as actions from '../constants/ActionTypes';
import moment from 'moment';
import {precisionDecimales, getProductoInline, getStateTotales} from '../helpers';

type actionType = {
  type: string
};

const defaultState = () => {
    return {
        _id: null,
        sesionCaja: null,
        ventaIndex: null,

        folio: null,
        numero_serie: null,

        ac_producto: '',
        ac_cliente: '',
        
        siguienteFolio: '',

        solicitiarRecarga: false,
        pagoServicioLdi: false,
        requiereFactura: false,
        entregaDomicilio: false,
        direccionEntrega: null,

        productos: [],
        extra_fields: {},

        // totales
        total: 0,
        totalDescuento: 0,
        totalArticulos: 0,
        aCobrar: 0,
        cambio: 0,

        // pago
        credito: false,
        efectivo: {},
        cheque: {},
        tarjeta: {},
        transferencia: {},
        fondo: {},
        monedero: {},
        guardar: {
            habilitado: true, 
            texto: 'Guardar e imprimir'
        },

        // existencias almacen
        existenciasAlmacen: null,

        // comisiones
        cobrarComision: false,

        almacen: {},
        cliente: {},
        cajero: {},
        uso_cfdi: "P01",

        ventasEspera: [],
        pinpadSeleccionado: null,
        guardando: false,
        otraTerminalProsepago: false,
    }
}

export default function puntoVenta(state={...defaultState()}, action: actionType) {
    let newState = {...state}
    let data, venta, ventasEspera
    
    const _validar_pago = (pago) => {
        return pago.monto > 0;
    }

    let _reset_montos_pago = (state) => {
        return {
            efectivo: {},
            cheque: {...state.cheque, monto: 0},
            tarjeta: {...state.tarjeta, monto: 0},
            transferencia: {},
            fondo: {},
            monedero: {},
        }
    }

	switch (action.type) {

        case actions.PV_ABRIR_CAJA:
            return { ...state, sesionCaja: action.sesionCaja }

        case actions.PV_SELECCIONAR_CLIENTE:
            let prods = []

            if (action.productos && Object.keys(action.productos).length) {
                // productos con el precio unitario real
                prods = state.productos.map(p => {
                    if (action.productos[p.producto.id] && precisionDecimales(action.productos[p.producto.id].precio_unitario)) {
                        let precio_unitario_real = precisionDecimales(action.productos[p.producto.id].precio_unitario)
                        p.precio_neto = precio_unitario_real
                        p.importe = precisionDecimales(p.precio_neto * p.cantidad)
                        p = getProductoInline(p)
                        
                        // hotfix
                        p.precio_regular = p.precio_neto
                    }

                    return p
                })
            }

            if (prods.length) {
                newState.productos = prods
            }
            return {...newState, cliente: action.cliente, ...getStateTotales(newState)}
            

    	case actions.PV_SELECCIONAR_ALMACEN:
            return { ...state }

    	case actions.PV_REQUERIR_FACTURA:
            return { ...state, requiereFactura: !state.requiereFactura }

    	case actions.PV_ENTREGAR_DOMICILIO:
            return { ...state, entregaDomicilio: !state.entregaDomicilio }
    	
    	case actions.PV_SELECCIONAR_DIRECCION_ENTREGA:
            let direccionEntrega = null;

            direccionEntrega = state.cliente.direcciones_entrega.find(el => {
                return el.id === Number(action.id || 0)
            }) 

            return { ...state, direccionEntrega: direccionEntrega }

        case actions.SET_PV_AUTOCOMPLETE_PRODUCTO:
            data = action.data
            let productos = data.objects || []
            return {...state, ac_productos: productos}

        case actions.SET_PV_AUTOCOMPLETE_CLIENTE:
            data = action.data
            let clientes = data.objects || []
            return {...state, ac_clientes: clientes}

        case actions.PV_SELECCIONAR_PRODUCTO:
            let pi = getProductoInline(action.producto)
            newState.productos.unshift(pi)
            return {...newState, ...getStateTotales(newState), ac_productos:[]}

        case actions.PV_ELIMINAR_PRODUCTO:
            let index = action.index

            if (index > -1) {
                let prods = state.productos
                let productos = [
                    ...prods.slice(0, index),
                    ...prods.slice(index + 1),
                ]

                if (action.producto && action.producto.producto.complementario) {
                    index = productos.findIndex((e) => {
                        return e.producto.codigo === action.producto.producto.complementario.codigo
                    })

                    productos = [
                        ...productos.slice(0, index),
                        ...productos.slice(index + 1),
                    ]
                }

                state.productos = productos
                state = {...state, ..._reset_montos_pago(state)}
                return {...state, ...getStateTotales(state)}
            }

            return {...state}


        case actions.PV_SELECCIONAR_METODO_PAGO:
            let pago = action.pago
            if (pago.monto === 0) {
                newState = {...newState, [pago.tipo]: {}}
                return {...newState, ...getStateTotales(newState)}    
            }

            if (_validar_pago(pago)) {
                newState = {...newState, [pago.tipo]: pago}
                return {...newState, ...getStateTotales(newState)}
            }

            return {...newState}

        case actions.PV_CHANGE_TIPO_PAGO:
            newState = {...newState, [action.tipo]: action.data}
            return {...newState, ...getStateTotales(newState)}

        case actions.PV_NUEVA_VENTA:
            return {
                ...defaultState(), 
                productos: [],
                siguienteFolio: state.siguienteFolio,
                ventasEspera: state.ventasEspera,
                cliente: action.cliente || {},
                ac_cliente: action.cliente ? action.cliente.razon_social : '',
                cajero: state.cajero,
                sesionCaja: state.sesionCaja,
                almacen: state.almacen,
                extra_fields: {},
            }

        case actions.PV_SELECCIONAR_USO_CFDI:
            return {
                ...state, 
                uso_cfdi: action.uso_cfdi
            }

        case actions.PV_BORRAR_DATOS:
            return {
                ...defaultState()
            }

        case actions.PV_ACTUALIZAR_PRODUCTO_INLINE:
            index = newState.productos.findIndex((e) => {
                return e.producto.id === action.producto.producto.id
            })

            if (action.index) {
                index = action.index
            }

            if (index > -1) {
                let pi = getProductoInline(action.producto)
                newState.productos[index] = pi
                newState = {...newState, ..._reset_montos_pago(newState)}
                return {
                    ...newState, 
                    productos: newState.productos.map((i) => {
                        return i
                    }),
                    ...getStateTotales(newState)
                }
            }

            return {...newState}

        case actions.PV_LIMPIAR_SESION_CAJA:
            return {...state, sesionCaja: null}

        case actions.PV_CHANGE_INFO_EXTRA:
            let k = action.extra.nombre.replace('_field', '')
            let extra_fields  = {...state.extra_fields, [k]: action.valor}
            return {...state, extra_fields: extra_fields}

        case actions.PV_SET_UM_PRODUCTO:
            let producto = state.productos[action.index]
            pi = getProductoInline(producto, action.um)
            newState.productos[action.index] = pi
            newState = {...newState, ..._reset_montos_pago(newState)}
            return {...state, ...getStateTotales(newState)}


        case actions.PV_SET_VENTA_ESPERA:
            let enEspera = state.ventasEspera
            enEspera.unshift({
                ...action.venta,
                ...getStateTotales(action.venta),
                inicioEspera: moment(),
                ac_cliente: action.venta.cliente.razon_social
            })
            return {
                ...defaultState(), 
                productos: [],
                cliente: state.cliente,
                cajero: state.cajero,
                sesionCaja: state.sesionCaja,
                almacen: state.almacen,
                siguienteFolio: state.siguienteFolio,
                extra_fields: {}, 
                ventasEspera: enEspera
            };

        case actions.PV_CARGAR_VENTA_ESPERA:
            ventasEspera = state.ventasEspera

            if (action.ventaIndex <= ventasEspera.length) {
                venta = ventasEspera[action.ventaIndex]
                ventasEspera.splice(action.ventaIndex, 1);
            }

            return {
                ...venta,
                ...getStateTotales(venta),
                siguienteFolio: state.siguienteFolio,
                ventaIndex: action.ventaIndex,
                ventasEspera: ventasEspera
            }

        case actions.PV_ELIMINAR_VENTA_ESPERA:
            ventasEspera = state.ventasEspera

            if (action.ventaIndex <= ventasEspera.length) {
                ventasEspera.splice(action.ventaIndex, 1);
            }

            return {
                ...state,
                ventasEspera: ventasEspera
            }

        case actions.PV_SET_CLIENTE_AC:
            return {...state, ac_cliente: action.cliente}

        case actions.PV_SET_COBROS_PINPAD:
            return {...state, cobrosPinpad: action.cobrosPinpad}

        case actions.PV_SET_GUARDANDO_VENTA:
            return {...state, guardando: action.guardando}

        case actions.PV_SELECCIONAR_PINPAD:
            return {...state, pinpadSeleccionado: action.pinpad}

        case actions.PV_SIGUIENTE_FOLIO:
            return {...state, siguienteFolio: action.siguienteFolio}

        case actions.PV_TOGGLE_OTRA_TERMINAL_PROSEPAGO:
            return {...state, otraTerminalProsepago: !state.otraTerminalProsepago}

        case actions.PV_SET_PROP:
            return {...state, ...action.props}

        case actions.PV_CONCLUIR_VENTA:
            let copyVenta = {}
            for(var kk in state) {
                if (kk in action.venta) {
                    copyVenta[kk] = action.venta[kk]
                }
            }
            return {...state, ...copyVenta, ...getStateTotales(copyVenta)}

        default:
          return state;

    }

}