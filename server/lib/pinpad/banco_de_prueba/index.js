const helpers = require(`../../../helpers`);
const moment = require('moment');
let java = null;

module.exports.banco_de_prueba = {
    instanciada: false,
    banco: 'banco_de_prueba',
    liberarDispositivo: () => {
        return {
            status: 'error',
            mensaje: 'La integración para este banco no está implementada.'
        }
    },

    configurar: () => {
        return {
            status: 'error',
            mensaje: 'La integración para este banco no está implementada.'
        }
    },
    
    obtenerInstancia: (conf) => {
        return {
            status: 'error',
            mensaje: 'La integración para este banco no está implementada.'
        }
    },

    cobrarPago: (pago) => {
        return {
            status: 'error',
            mmensaje: 'La integración para este banco no está implementada.'
        }
    },

    verificarTransaccion: (datos={}) => {
        return {
            status: 'error',
            mmensaje: 'La integración para este banco no está implementada.'
        }
    },

    cancelarTransaccion: (datos={}) => {
        return {
            status: 'error',
            mmensaje: 'La integración para este banco no está implementada.'
        }
    },

    devolucionTransaccion: (datos={}) => {
        return {
            status: 'error',
            mmensaje: 'La integración para este banco no está implementada.'
        }
    },
    
    cobrarVenta: (venta) => {
        return {
            status: 'error',
            mmensaje: 'La integración para este banco no está implementada.'
        }
    },

    getInfoCobro: (cobroPinpad) => {
       return {
            status: 'error',
            mmensaje: 'La integración para este banco no está implementada.'
        }
    },
    recargarInstancia: (conf) => {
        return {
            status: 'error',
            mmensaje: 'La integración para este banco no está implementada.'
        }
}