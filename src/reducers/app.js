import * as actions from '../constants/ActionTypes';

type actionType = {
  type: string
};


const defaultState = {
    api_key: null,
    showSidebar: false,
    authenticated: false,
    actualizacionDisponible: false,
    statusActualizacion: null,
    cargando: true,
	errorValidacion: null,
    error: null,
    mensajeAlerta: null,

    /* Almacenes */
    almacenes: [],
    
    configuracion: {
    },
    venta: null,
    recepcionPago: null,
    usuario: {
        id: 1,
        username: 'jahaziel',
        email: 'jahaziel@admintotal.com'
    },
    sincronizaciones: {
        ventas: {
            habilitado: true
        },
        retirosEfectivo: {
            habilitado: true
        },
        recepcionesPago: {
            habilitado: true
        },
    }
}

export default function app(state=defaultState, action: actionType) {
  switch (action.type) {

    case actions.TOGGLE_SIDEBAR:
    	return {
        	...state,
	        showSidebar: !state.showSidebar,
            venta: null
		};

    case actions.SINC_SET_HABILITADO:
        return {
            ...state, 
            sincronizaciones: {
                ...state.sincronizaciones,
                [action.sincronizacion]: {
                    ...state.sincronizaciones[action.sincronizacion], 
                    habilitado: action.habilitado
                }
            }
        }

    case actions.SET_CONFIGURACION:
        let pinpadModoPruebas = false

        if (action.data.pinpad && action.data.habilitarPinpad) {
            if (action.data.pinpad.banco.toLowerCase() === 'banorte') {
                pinpadModoPruebas = action.data.pinpad.modoPruebas
            }

            if (action.data.pinpad.banco.toLowerCase() === 'santander') {
                pinpadModoPruebas = action.data.pinpad.url === 'https://qa3.mitec.com.mx'
            }
        }

        return {
            ...state,
            sincronizaciones: {...state.sincronizaciones, ...action.data.sincronizaciones},
            configuracion: {
                ...action.data.configuracion, 
                folio_inicial: action.data.folio_inicial,
                numero_serie: action.data.numero_serie,
                almacen: action.data.almacen,
                mostrarCamposAdicionales: action.data.mostrarCamposAdicionales,
                mostrarExistenciasAlmacenes: action.data.mostrarExistenciasAlmacenes,
                habilitarBascula: action.data.habilitarBascula,
                habilitarPinpad: action.data.habilitarPinpad,
                pinpad: {
                    banco: action.data.pinpad ? action.data.pinpad.banco : null,
                    modoPruebas: pinpadModoPruebas,
                },
                bascula: action.data.bascula,
                impresora: action.data.impresora,
                habilitarProsepago: action.data.habilitarProsepago,
                terminal: action.data.terminal
            }
        };

    case actions.SET_SESSION:
        if (!action.data) {
            return {
                ...defaultState, 
                authenticated: false,
                usuario: null,
                errorValidacion: null,
            }
        }
        
        if (action.data.status === 'error') {
            return {
                ...defaultState, 
                authenticated: false,
                usuario: null,
                errorValidacion: action.data.message,
            }
        }
        
        return {
            ...state, 
            error: null,
            authenticated: true,
            api_key: action.data.api_token,
            usuario: {
                ...action.data
            }
        }

    case actions.SET_ALMACENES:
        return {
            ...state, 
            almacenes: action.data,
        }

    case actions.SET_SINCRONIZACIONES:
        return {
            ...state,
            sincronizaciones: {...state.sincronizaciones, ...action.data}
        }

    case actions.API_ERROR:
        let errorMessage = action.error && typeof action.error === "object" ? action.error.message : action.error;
        if (errorMessage === 'Network Error') {
            errorMessage = 'El servidor local no se encuentra activo.';
        }
        return {...state, error: errorMessage}

    case actions.MENSAJE_SUCCESS:
        return {...state, flash_success: action.mensaje}

    case actions.CARGANDO:
        return {...state, cargando: action.mostrar}

    case actions.LOGOUT_ON_CLOSE:
        return {...state}

    case actions.SET_ACTUALIZACION_DISPONIBLE:
        return {...state, actualizacionDisponible: action.actualizacionDisponible}

    case actions.SET_STATUS_ACTUALIZACION:
        return {...state, statusActualizacion: action.statusActualizacion}

    case actions.MOSTRAR_ALERTA:
        return {...state, mensajeAlerta: action}

    case actions.OCULTAR_ALERTA:
        return {...state, mensajeAlerta: null}

    case actions.VER_VENTA:
        let venta = {
            ...action.venta, 
            habilitarEnvioEdicion: action.habilitarEnvioEdicion, 
            onReenviarVenta: action.onReenviarVenta,
            onSincronizarVenta: action.onSincronizarVenta,
        }

        if (! action.venta ) {
            venta = null
        }

        return {...state, venta: venta}

    case actions.VER_RECEPCION_PAGO:
        let rp = {
            ...action.recepcionPago, 
            habilitarEnvioEdicion: action.habilitarEnvioEdicion, 
            onSincronizar: action.onSincronizar,
        }

        if (! action.recepcionPago ) {
            rp = null
        }

        return {...state, recepcionPago: rp}

    case actions.SET_AUTORIZACIONES:
        if (action.autorizaciones) {
            return {
                ...state, 
                usuario: {
                    ...state.usuario,
                    autorizaciones: action.autorizaciones
                }
            }
        }
        break

    default:
      return {...state};
  }
}
