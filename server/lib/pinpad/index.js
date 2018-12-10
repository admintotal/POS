const banorte = require(`./banorte`).banorte
const santander = require(`./santander`).santander

module.exports.integraciones = {
    obtenerIntegracion: (banco) => {
        if ((banco in exports.integraciones)) {
            return exports.integraciones[banco]
        }
        return {
            status: 'error',
            message: 'El banco no fué especificado.'
        }
    },
    banorte: banorte,
    santander: santander,
}