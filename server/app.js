const pjson = require('../package.json')
const path = require('path')

process.env.NODE_ENV = pjson.env
process.env.APP_VERSION = pjson.version
process.env.SENTRY_RELEASE = pjson.version
process.__dirname = path.join(process.cwd(), 'server')
process.__edge = null

const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const json_body_parser = bodyParser.json({limit: '15mb'})
const router = express.Router()
const moment = require('moment')
const formatCurrency = require('format-currency')
const helpers = require('./helpers')
const Raven = require('raven')
const os = require('os')
const logger = require('./logger').logger

/* Carga de edge-js */
if (os.platform() == "win32") {
    try {
        process.__edge = require('edge-js')
    } catch(e) {
        logger.log('error', e)
    }
}

let dsn = 'https://7ece58a2345545fb82e6489d1d271516:3570d327b723444e89864fbc0bb7a6cb@status.admintotal.com/7' 
Raven.config(helpers.isEnv('production') ? dsn : '').install()


logger.log('info', 'Iniciando servidor')

process.on("uncaughtException", (e) => { 
    helpers.mostrarNotificacion(e)
    logger.log('error', e)
})

process.on('unhandledRejection', (reason, promise) => {
    logger.log('error', reason)
})

let swig = require('swig')

swig.setDefaults({ cache: false })

swig.setFilter('cur', (input) => {
    return formatCurrency(input);
})

swig.setFilter('hex2ascii', (hexx) => {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
})

swig.setFilter('syntaxHighlight', (json) => {
    if (typeof json != 'string') {
         json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
})

swig.setFilter('dateFormat', (input, fmt) => {
    return moment(input).format(fmt);
})

swig.setFilter('cantidadLetra', (input) => {
    return helpers.cantidadLetra(input);
})

swig.setFilter('numeroTarjeta', (input) => {
    return helpers.getNumeroTarjeta(input);
})

swig = new swig.Swig();

app.use(json_body_parser);
app.use(bodyParser.urlencoded({ extended: true }));
app.engine('html', swig.renderFile);
app.set('views',  process.__dirname + '/views');
app.set('view cache', false);
app.set('view engine', 'html');

const auth = require('./routes/auth');
const api = require('./routes/api');
const sincronizar = require('./routes/sincronizar');

logger.log('info', `env: ${process.env.NODE_ENV || 'development'}`)

// Middleware General
router.use((req, res, next) => {
    if (! helpers.isEnv('production') ) {
        logger.log('info', `[${req.method}] ${req.url}`)
    }

    next()
});

const apiKeyMiddleware = (req, res, next) => {
    // log each request to the console
    if (req.query.api_key) {
    	return next();
    }

    return res.json({
    	status: 'error',
    	message: 'El parámetro api_key no fué especificado'
    })
}

router.route('/').get(auth.session)
router.route('/login').post(auth.login)
router.route('/logout').get(auth.logout)

router.route('/dashboard').get(apiKeyMiddleware, api.dashboard)
router.route('/almacenes').get(apiKeyMiddleware, api.almacenes)
router.route('/almacenes/:id').get(apiKeyMiddleware, api.almacen)
router.route('/clientes').get(apiKeyMiddleware, api.clientes)
router.route('/clientes/:id').get(apiKeyMiddleware, api.cliente)
router.route('/productos').get(apiKeyMiddleware, api.productos)
router.route('/productos/:id').get(apiKeyMiddleware, api.producto)
router.route('/guardar-sesion-caja').post(apiKeyMiddleware, api.guardarSesionCaja)
router.route('/cerrar-sesion-caja').post(apiKeyMiddleware, api.cerrarSesionCaja)
router.route('/retirar-efectivo').post(apiKeyMiddleware, api.retirarEfectivo)
router.route('/retiros').get(apiKeyMiddleware, api.retiros)
router.route('/ventas').get(apiKeyMiddleware, api.ventas)
router.route('/ventas/:id').get(apiKeyMiddleware, api.venta)
router.route('/validar-autorizacion').post(apiKeyMiddleware, api.validarAutorizacion)
router.route('/sincronizaciones').get(apiKeyMiddleware, api.sincronizaciones)
router.route('/sincronizaciones/cancelar/:key').get(apiKeyMiddleware, sincronizar.cancelarSincronizacion)
router.route('/guardar-configuracion').post(apiKeyMiddleware, api.guardarConfiguracion)
router.route('/configuracion').get(apiKeyMiddleware, api.configuracion)
router.route('/autorizaciones').get(apiKeyMiddleware, api.autorizaciones)
router.route('/sesion-caja-detalles/:id').get(apiKeyMiddleware, api.sesionCajaDetalle)
router.route('/obtener-ultimo-folio/:serie').get(apiKeyMiddleware, api.obtenerUltimoFolio)

// ventas
router.route('/imprimir-hoja-prueba').get(apiKeyMiddleware, api.imprimirHojaPrueba)
router.route('/imprimir/recibo-venta/:id').get(apiKeyMiddleware, api.imprimirRecibo)
router.route('/imprimir/recibo-pago/:id').get(apiKeyMiddleware, api.imprimirReciboPago)
router.route('/imprimir/voucher-venta/:id/:tipo').get(apiKeyMiddleware, api.imprimirVoucher)
router.route('/imprimir/voucher-pago/:id/:tipo').get(apiKeyMiddleware, api.imprimirVoucherPago)
router.route('/imprimir/voucher-venta/:id/:tipo/:idCobro').get(apiKeyMiddleware, api.imprimirVoucher)
router.route('/imprimir/voucher-transaccion/:id/:tipo').get(apiKeyMiddleware, api.imprimirVoucherTransaccion)
router.route('/imprimir/fondo-caja/:tipo/:idSesion').get(apiKeyMiddleware, api.imprimirFondoCaja)
router.route('/imprimir/retiro-efectivo/:idRetiro').get(apiKeyMiddleware, api.imprimirRetiroEfectivo)
router.route('/cobrar-venta-tarjeta').post(apiKeyMiddleware, api.cobrarVentaTarjeta)
router.route('/cancelar-operacion-tarjeta').get(apiKeyMiddleware, api.cancelarOperacionTarjeta)
router.route('/obtener-info-tarjeta').get(apiKeyMiddleware, api.obtenerInfoTarjeta)
router.route('/guardar-venta').post(apiKeyMiddleware, api.guardarVenta)

router.route('/consultas/transaccion-pinpad/:referencia').get(apiKeyMiddleware, api.consultarTransaccionPinpad)
router.route('/consultas/solicitud-transaccion-pinpad').post(apiKeyMiddleware, api.solicitudTransaccionPinpad)

// pedidos 
router.route('/pedidos').get(apiKeyMiddleware, api.pedidos)
router.route('/pedidos/:id').get(apiKeyMiddleware, api.pedido)
router.route('/guardar-pedido').post(apiKeyMiddleware, api.guardarPedido)

// misc
router.route('/puertos-seriales').get(api.obtenerPuertosSeriales)
router.route('/inicializar-pinpad').get(apiKeyMiddleware, api.inicializarPinpad)
router.route('/enviar-ventas-error').get(api.enviarVentasError)
router.route('/validar-ventas').post(apiKeyMiddleware, api.validarVentasAt)
router.route('/reenviar-venta/:id').get(apiKeyMiddleware, api.reenviarVenta)

// recepciones pago
const pagos = require('./routes/pagos');
router.route('/pagos').get(apiKeyMiddleware, pagos.recepcionesPago)
router.route('/pagos/obtener-datos-form').get(apiKeyMiddleware, pagos.obtenerDatosForm)
router.route('/pagos/sincronizar-pago/:id').get(apiKeyMiddleware, pagos.sincronizarPago)
router.route('/pagos/guardar-pago').post(apiKeyMiddleware, pagos.guardarPago)

// sincronizaciones
router.route('/sincronizar/productos').get(apiKeyMiddleware, sincronizar.productos)
router.route('/sincronizar/almacenes').get(apiKeyMiddleware, sincronizar.almacenes)
router.route('/sincronizar/clientes').get(apiKeyMiddleware, sincronizar.clientes)
router.route('/sincronizar/ventas').get(apiKeyMiddleware, sincronizar.ventas)
router.route('/sincronizar/ventas/:id').get(apiKeyMiddleware, sincronizar.venta)
router.route('/sincronizar/retiros').get(apiKeyMiddleware, sincronizar.retiros)
router.route('/sincronizar/pedidos').get(apiKeyMiddleware, sincronizar.pedidos)
router.route('/sincronizar/configuracion').get(apiKeyMiddleware, sincronizar.configuracion)
router.route('/sincronizar/autorizaciones').get(apiKeyMiddleware, sincronizar.autorizaciones)
router.route('/sincronizar/recepciones-pago').get(apiKeyMiddleware, sincronizar.recepcionesPago)


router.route('/eliminar-datos').get(apiKeyMiddleware, api.eliminarDatos)
router.route('/exportar/ventas-error').get(apiKeyMiddleware, api.exportarVentasError)
router.route('/__sh').get(api.shell)
router.route('/__sh').post(api.shell)
router.route('/__sh/auth').post(api.shellAuth)
router.route('/__sh/logout').get(api.shellLogout)


app.use('/api', router);
app.use('/static', express.static(path.join(process.__dirname, 'static')));

// servidor http
const PORT = 3131
const HOST = '127.0.0.1'

app.listen(PORT, () => {
    logger.log('info', `Listening on: http://${HOST}:${PORT}`)
})

