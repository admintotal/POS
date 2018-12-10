const edge = require('edge-js');

const getIntanciaEMV = edge.func({
    source: 'lib/pinpad/santander/santander.cs',
    references: [ 
        'lib/pinpad/santander/cpIntegracionEMV.dll',
    ]
});
const instance = getIntanciaEMV(null, true)
const config = {
    URL: 'https://qa3.mitec.com.mx',
    URL_PublicKey: 'https://qa10.mitec.com.mx',
    Usuario: '9249SKUS0',
    Password: 'MXKZ7PQX55',
}

let inicializado = instance.Inicializar(config, true)
console.log("=========================")
console.log("Resultado inicializacion: " + inicializado)
console.log("=========================")

console.log("=========================")
console.log("Solicitando autorizacion: " + inicializado)
console.log("=========================")
let venta = {
    Total: "150.00"
}

console.log(instance.RealizarCobro(venta, true))