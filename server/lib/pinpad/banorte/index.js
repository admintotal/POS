const helpers = require(`../../../helpers`);
const moment = require('moment');
let java = null;

try{
    java = require('java');
} catch(e){
    
}

module.exports.banorte = {
    instanciada: false,
    banco: 'banorte',
    liberarDispositivo: () => {
        module.exports.banorte.logger.log('info', `[${module.exports.banorte.banco}] Liberando dispositivo.`)
        if (!process.pinpadInstance) {
            return 
        }

        try{
            process.pinpadInstance.liberarDispositivo();
        } catch(e) {
            module.exports.banorte.logger.log('error', e)
        }
    },

    consultarTransacciones: () => {
        return []
    },

    configurar: () => {
        if (!java) {
            return {
                status: 'error',
                mensaje: 'El módulo de node-java no fué cargado correctamente.'
            }
        }

        try {
            let selectorSalida = java.newInstanceSync('java.util.HashMap')
            process.pinpadInstance.obtenerSelectorSync(selectorSalida)

            let selector = selectorSalida.getSync("SELECTOR")
            let llaveEntrada = java.newInstanceSync('java.util.HashMap')
            let llaveSalida = java.newInstanceSync('java.util.HashMap')
            let props = module.exports.banorte._props

            llaveEntrada.putSync("MERCHANT_ID", props.noAfiliacion)
            llaveEntrada.putSync("USER", helpers.decrypt(props.usuario))
            llaveEntrada.putSync("PASSWORD", helpers.decrypt(props.password))
            llaveEntrada.putSync("RESPONSE_LANGUAGE", "ES")
            llaveEntrada.putSync("CMD_TRANS", "GET_KEY")
            llaveEntrada.putSync("CONTROL_NUMBER", `SOLICITARLLAVE${props.usuario}`)
            llaveEntrada.putSync("BANORTE_URL", "https://via.pagosbanorte.com/InterredesSeguro")
            llaveEntrada.putSync("SELECTOR", selector)

            module.exports.banorte.logger.log('info', `[${module.exports.banorte.banco}] Enviando solicitud para obtener llave maestra.`)
            java.callStaticMethodSync('com.banorte.ConectorBanorte', 'enviarTransaccion', llaveEntrada, llaveSalida)
            
            let resultadoPayw = llaveSalida.getSync('RESULTADO_PAYW')
            let codigoPayw = llaveSalida.getSync('CODIGO_PAYW')
            let llaveMaestra = llaveSalida.getSync('TEXTO')

            if (resultadoPayw != "A") {
                let error = `[${module.exports.banorte.banco}] Error al obtener llave maestra: ${llaveSalida.toString()}`
                module.exports.banorte.logger.log('error', error)
                throw new Error(error)
            }

            module.exports.banorte.logger.log('info', `[${module.exports.banorte.banco}] Iniciando carga de llave maestra.`)
            let cargarLlave = java.newInstanceSync('java.util.HashMap')
            cargarLlave.putSync('NUMERO_SERIE', module.exports.banorte._numeroSerie)
            cargarLlave.putSync('LLAVE_MAESTRA', llaveMaestra)
            process.pinpadInstance.cargarLlaveMaestraSync(cargarLlave)
            // return process.pinpadInstance.configurar()
            return {
                status: 'success',
                mensaje: 'Configurado correctamente'
            }
        } catch(e) {
            module.exports.banorte.logger.log('error', e)
            process.instanciada = false;
            if (e.message.indexOf('Error al obtener llave maestra') > -1) {
                return {
                    status: 'error',
                    mensaje: 'Error al obtener llave maestra'
                }
            }

            return {
                status: 'error',
                mensaje: JSON.stringify(e)
            }
        }
    },
    
    obtenerInstancia: (conf) => {
        module.exports.banorte.logger.log('info', `[${module.exports.banorte.banco}] Obteniendo instancia...`)

        if (!java) {
            return {
                status: 'error',
                mensaje: 'El módulo de java no fué cargado correctamente.'
            }
        }

        try {
            java.classpath.push(`${process.__dirname}/lib/pinpad/banorte/BanortePinPadSeguro.jar`)
            java.options.push(`-Djava.library.path=${process.__dirname}/lib/pinpad/banorte`)

            // instancia 
            process.pinpadInstance = java.newInstanceSync(`com.banorte.pinpad.${conf.modeloPinpad}Segura`, 'ES');
            module.exports.banorte._props = conf;

            // conf conexión puerto serial
            const configPuerto = java.newInstanceSync('java.util.HashMap', 2);
            configPuerto.putSync('PUERTO', conf.comName)
            configPuerto.putSync('VELOCIDAD', conf.velocity || '19200')
            configPuerto.putSync('PARIDAD', conf.parity || 'N')
            configPuerto.putSync('BITS_PARO', conf.stopBits || '1')
            configPuerto.putSync('BITS_DATOS', conf.dataBits || '8')

            // inicialización del pinpad
            module.exports.banorte.logger.log('info', `[${module.exports.banorte.banco}] Inicializando dispositivo: ${configPuerto.toString()}`)
            process.pinpadInstance.inicializarDispositivoSync(configPuerto)

            // obtener información del dispositivo
            let info = java.newInstanceSync('java.util.HashMap', 5);
            process.pinpadInstance.obtenerInformacionSync(info)
            module.exports.banorte.logger.log('info', `[${module.exports.banorte.banco}] Información del dispositivo: ${info.toString()}`)
            module.exports.banorte._numeroSerie = info.getSync('NUMERO_SERIE')
            module.exports.banorte.logger.log('info', `[${module.exports.banorte.banco}] Instancia creada correctamente.`)
            module.exports.banorte.instanciada = true
        } catch(e) {
            module.exports.banorte.logger.log('error', e)
            process.pinpadInstance.liberarDispositivo()
            process.pinpadInstance = null;
            process.instanciada = false;

            if (e.message.indexOf('verifique que exista y esté libre') > -1) {
                return {
                    status: 'error',
                    mensaje: 'Falla al intentar inicializar puerto; verifique que exista y esté libre.'
                }
            }

            return {
                status: 'error',
                mensaje: 'El módulo de java no fué cargado correctamente.'
            }
        }
    },

    cobrarPago: (pago) => {
        return {
            status: 'error',
            mensaje: 'La integración de banorte para este módulo no esta disponible.'
        }
    },

    verificarTransaccion: (datos={}) => {
        let props = module.exports.banorte._props
        let parametrosEntrada = java.newInstanceSync('java.util.HashMap', 20);
        let parametrosSalida = java.newInstanceSync('java.util.HashMap', 20);

        if (!datos.referencia) {
            return {
                status: 'error',
                mensaje: 'La referencia no fué especificada.'
            }
        }

        parametrosEntrada.putSync("ID_AFILIACION", props.noAfiliacion);
        parametrosEntrada.putSync("USUARIO", helpers.decrypt(props.usuario));
        parametrosEntrada.putSync("CLAVE_USR", helpers.decrypt(props.password));
        parametrosEntrada.putSync("CMD_TRANS", "VERIFICACION");
        parametrosEntrada.putSync("REFERENCIA", datos.referencia);
        if (datos.numeroControl) {
            parametrosEntrada.putSync("NUMERO_CONTROL", datos.numeroControl);
        }
        parametrosEntrada.putSync("ID_TERMINAL", module.exports.banorte._numeroSerie);
        parametrosEntrada.putSync("IDIOMA_RESPUESTA", "ES");
        parametrosEntrada.putSync("URL_BANORTE", "https://via.pagosbanorte.com/InterredesSeguro");

        let pinpadEnv = "AUT"

        if (! props.modoPruebas ) {
            pinpadEnv = "PRD"
        }

        parametrosEntrada.putSync("MODO", pinpadEnv);

        try {
            let resultado = {}
            process.pinpadInstance.procesarTransaccionSync(parametrosEntrada, parametrosSalida)
            
            let tiposTransaccion = {
                VTA: 'Venta estándar',
                VPR: 'Venta con promoción',
                VFZ: 'Venta forzada',
                PRE: 'Preautorización',
                REA: 'Reautorización',
                POS: 'Postautorización',
                CRD: 'Crédito',
                DEV: 'Devolución estándar',
                CAN: 'Cancelación',
                CSB: 'Cashback',
                REV: 'Reversa',
            }

            let codigosPayw = {
                A: 'Abierta',
                C: 'Cerrada',
                P: 'Con devolución parcial',
                R: 'Reversada',
                T: 'Con devolución total',
                V: 'Cancelada',
                X: 'Indefinida'
            }

            let resultadosPayw = {
                A: 'Aprobada',
                D: 'Declinada',
                R: 'Rechazada',
                T: 'Sin Respuesta'
            }

            let getFecha = (f, ff='YYYYMMDD HH:mm') => {
                if (!f || f === "") {
                    return f
                }

                return moment(f, ff).toISOString()
            }

            switch(parametrosSalida.getSync('RESULTADO_PAYW')) {
                // APROBADA
                case 'A':
                    let [
                        tipoTransaccion, 
                        referencia,
                        noTarjeta,
                        monto,
                        codigoPayw,
                        resultadoPayw,
                        resultadoAutorizador,
                        autorizacion,
                        fechaHoraBanorte,
                        fechaHoraProsa,
                        fechaHoraSalidaProsa,
                        fechaHoraSalidaBanorte,
                    ] = parametrosSalida.getSync('TEXTO').split('|')

                    fechaHoraBanorte = getFecha(fechaHoraBanorte)
                    fechaHoraProsa = getFecha(fechaHoraProsa)
                    fechaHoraSalidaProsa = getFecha(fechaHoraSalidaProsa)
                    fechaHoraSalidaBanorte = getFecha(fechaHoraSalidaBanorte)
                    
                    resultado = {
                        status:'success',
                        mensaje: codigosPayw[codigoPayw],
                        datos: {
                            status: codigosPayw[codigoPayw],
                            resultadoTransaccion: resultadosPayw[resultadoPayw],
                            tipoTransaccion: tiposTransaccion[tipoTransaccion],
                            autorizacion: autorizacion,
                            resultadoAutorizador: resultadoAutorizador,
                            referencia: referencia,
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            fechaHora: fechaHoraBanorte,
                            fechaHoraSalida: fechaHoraSalidaBanorte,
                            fechaHoraProsa: fechaHoraProsa,
                            fechaHoraSalidaProsa: fechaHoraSalidaProsa,
                            noTarjeta: noTarjeta,
                            afiliacion: parametrosSalida.getSync('ID_AFILIACION') || '',
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                            importe: monto
                        }
                    }
                    break;

                case 'R':
                    resultado = {
                        status: 'error',
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        datos: {
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            resultadoTransaccion: 'rechazada',
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                        }
                    }
                    break;


                default:
                    resultado = {
                        status: 'error',
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        datos: {
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                        }
                    }
                    break;
            }

            return resultado
        } catch(e) {
            module.exports.banorte.logger.log('error', {status: 'error', 'mensaje': e})
            return {
                status: 'error',
                mensaje: e.message
            }
        }
    },

    cancelarTransaccion: (datos={}) => {
        let props = module.exports.banorte._props
        let parametrosEntrada = java.newInstanceSync('java.util.HashMap', 20);
        let parametrosSalida = java.newInstanceSync('java.util.HashMap', 20);

        if (!datos.referencia) {
            return {
                status: 'error',
                mensaje: 'La referencia no fué especificada.'
            }
        }

        if (!datos.monto) {
            return {
                status: 'error',
                mensaje: 'El monto de la devolución no fué especificado.'
            }
        }

        parametrosEntrada.putSync("ID_AFILIACION", props.noAfiliacion);
        parametrosEntrada.putSync("USUARIO", helpers.decrypt(props.usuario));
        parametrosEntrada.putSync("CLAVE_USR", helpers.decrypt(props.password));
        parametrosEntrada.putSync("CMD_TRANS", "CANCELACION");
        parametrosEntrada.putSync("REFERENCIA", datos.referencia);
        parametrosEntrada.putSync("NUMERO_CONTROL", `CAN-${datos.referencia}-${+new Date()}`);
        parametrosEntrada.putSync("ID_TERMINAL", module.exports.banorte._numeroSerie);
        parametrosEntrada.putSync("IDIOMA_RESPUESTA", "ES");
        parametrosEntrada.putSync("URL_BANORTE", "https://via.pagosbanorte.com/InterredesSeguro");

        let pinpadEnv = "AUT"

        if (! props.modoPruebas ) {
            pinpadEnv = "PRD"
        }

        parametrosEntrada.putSync("MODO", pinpadEnv);

        try {
            let resultado = {}
            process.pinpadInstance.procesarTransaccionSync(parametrosEntrada, parametrosSalida)
            
            let inicioTransaccion = moment(parametrosSalida.getSync('FECHA_REQ_CTE'), 'YYYY/MM/DD HH:mm:SS').toISOString()
            let finTransaccion = moment(parametrosSalida.getSync('FECHA_RSP_CTE'), 'YYYY/MM/DD HH:mm:SS').toISOString()

            switch(parametrosSalida.getSync('RESULTADO_PAYW')) {
                // APROBADA
                case 'A':
                    resultado = {
                        status:'success',
                        integracion: module.exports.banorte.banco,
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        datos: {
                            autorizacion: parametrosSalida.getSync('CODIGO_AUT'),
                            referencia: parametrosSalida.getSync('REFERENCIA'),
                            resultadoTransaccion: parametrosSalida.getSync('TEXTO'),
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            inicioTransaccion: inicioTransaccion,
                            finTransaccion: finTransaccion,
                            noTarjeta: parametrosSalida.getSync('TARJETA_REFERIDA'),
                            afiliacion: parametrosSalida.getSync('ID_AFILIACION') || '',
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                            importe: datos.monto
                        }
                    }
                    break;

                case 'R':
                    resultado = {
                        status: 'error',
                        integracion: module.exports.banorte.banco,
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        datos: {
                            resultadoTransaccion: 'rechazada',
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            inicioTransaccion: inicioTransaccion,
                            finTransaccion: finTransaccion,
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                            importe: datos.monto
                        }
                    }
                    break;

                default:
                    resultado = {
                        status: 'error',
                        integracion: module.exports.banorte.banco,
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        datos: {
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            inicioTransaccion: inicioTransaccion,
                            finTransaccion: finTransaccion,
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                            importe: datos.monto
                        }
                    }
                    break;
            }

            return resultado
        } catch(e) {
            module.exports.banorte.logger.log('error', {status: 'error', 'mensaje': e})
            return {
                status: 'error',
                integracion: module.exports.banorte.banco,
                mensaje: e.message
            }
        }
    },

    devolucionTransaccion: (datos={}) => {
        let props = module.exports.banorte._props
        let parametrosEntrada = java.newInstanceSync('java.util.HashMap', 20);
        let parametrosSalida = java.newInstanceSync('java.util.HashMap', 20);

        if (!datos.referencia) {
            return {
                status: 'error',
                mensaje: 'La referencia no fué especificada.'
            }
        }

        if (!datos.monto) {
            return {
                status: 'error',
                mensaje: 'El monto de la devolución no fué especificado.'
            }
        }

        parametrosEntrada.putSync("ID_AFILIACION", props.noAfiliacion);
        parametrosEntrada.putSync("USUARIO", helpers.decrypt(props.usuario));
        parametrosEntrada.putSync("CLAVE_USR", helpers.decrypt(props.password));
        parametrosEntrada.putSync("CMD_TRANS", "DEVOLUCION");
        parametrosEntrada.putSync("REFERENCIA", datos.referencia);

        parametrosEntrada.putSync("NUMERO_CONTROL", `DEV-${datos.referencia}-${+new Date()}`);
    
        parametrosEntrada.putSync("MONTO", `${datos.monto}`);

        parametrosEntrada.putSync("ID_TERMINAL", module.exports.banorte._numeroSerie);
        parametrosEntrada.putSync("IDIOMA_RESPUESTA", "ES");
        parametrosEntrada.putSync("URL_BANORTE", "https://via.pagosbanorte.com/InterredesSeguro");

        let pinpadEnv = "AUT"

        if (! props.modoPruebas ) {
            pinpadEnv = "PRD"
        }

        parametrosEntrada.putSync("MODO", pinpadEnv);

        try {
            let resultado = {}
            process.pinpadInstance.procesarTransaccionSync(parametrosEntrada, parametrosSalida)
            
            let inicioTransaccion = moment(parametrosSalida.getSync('FECHA_REQ_CTE'), 'YYYY/MM/DD HH:mm:SS').toISOString()
            let finTransaccion = moment(parametrosSalida.getSync('FECHA_RSP_CTE'), 'YYYY/MM/DD HH:mm:SS').toISOString()

            switch(parametrosSalida.getSync('RESULTADO_PAYW')) {
                // APROBADA
                case 'A':
                    resultado = {
                        status:'success',
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        integracion: module.exports.banorte.banco,
                        datos: {
                            autorizacion: parametrosSalida.getSync('CODIGO_AUT'),
                            resultadoTransaccion: parametrosSalida.getSync('TEXTO'),
                            referencia: parametrosSalida.getSync('REFERENCIA'),
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            inicioTransaccion: inicioTransaccion,
                            finTransaccion: finTransaccion,
                            noTarjeta: parametrosSalida.getSync('TARJETA_REFERIDA'),
                            afiliacion: parametrosSalida.getSync('ID_AFILIACION') || '',
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                            importe: datos.monto,
                        }
                    }
                    break;

                case 'R':
                    resultado = {
                            status: 'error',
                            mensaje: parametrosSalida.getSync('TEXTO'),
                            integracion: module.exports.banorte.banco,
                            datos: {
                                numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                                resultadoTransaccion: 'rechazada',
                                inicioTransaccion: inicioTransaccion,
                                finTransaccion: finTransaccion,
                                respuesta: parametrosSalida.toString(),
                                terminal: module.exports.banorte._numeroSerie,
                                importe: datos.monto,
                            }
                        }
                    break;

                default:
                    resultado = {
                        status: 'error',
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        integracion: module.exports.banorte.banco,
                        datos: {
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            inicioTransaccion: inicioTransaccion,
                            finTransaccion: finTransaccion,
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                            importe: datos.monto,
                        }
                    }
                    break;
            }

            return resultado
        }catch(e) {
            if (e.message.indexOf('verifique que exista y esté libre') > -1) {
                return {
                    status: 'error',
                    integracion: module.exports.banorte.banco,
                    mensaje: 'Falla al intentar inicializar puerto; verifique que exista y esté libre.'
                }
            }

            if (e.message.indexOf('URL no reconocido') > -1) {
                return {
                    status: 'error',
                    integracion: module.exports.banorte.banco,
                    mensaje: 'Hubo un problema al comunicarnos con el servidor de banorte, asegurese de estar conectado a internet.'
                }
            }
            
            module.exports.banorte.logger.log('error', {
                status: 'error',
                integracion: module.exports.banorte.banco,
                mensaje: e.message
            })

            return {
                status: 'error',
                integracion: module.exports.banorte.banco,
                mensaje: e.message
            }
        }
    },
    
    cobrarVenta: (venta) => {
        if (!java) {
            return {
                status: 'error',
                mensaje: 'El módulo de java no fué cargado correctamente.'
            }
        }
        
        // return process.pinpadInstance.cobrarVenta(venta)
        let props = module.exports.banorte._props
        let importe = venta.tarjeta.monto
        let parametrosEntrada = java.newInstanceSync('java.util.HashMap', 20);
        let parametrosSalida = java.newInstanceSync('java.util.HashMap', 20);

        //Parámetros de entrada de la transacción
        parametrosEntrada.putSync("ID_AFILIACION", props.noAfiliacion);
        parametrosEntrada.putSync("USUARIO", helpers.decrypt(props.usuario));
        parametrosEntrada.putSync("CLAVE_USR", helpers.decrypt(props.password));

        parametrosEntrada.putSync("CMD_TRANS", "VENTA");
        parametrosEntrada.putSync("ID_TERMINAL", module.exports.banorte._numeroSerie);
        parametrosEntrada.putSync("MONTO", `${importe}`);
        parametrosEntrada.putSync("NUMERO_CONTROL", `${venta.numero_serie}-${venta.folio}-${+ new Date()}`);


        // producción: PRD
        // siempre autorizando: AUT
        // siempre declinando: DEC
        // aleatorio: RND
        let pinpadEnv = "AUT"

        if (! props.modoPruebas ) {
            pinpadEnv = "PRD"
        }

        parametrosEntrada.putSync("MODO", pinpadEnv);
        parametrosEntrada.putSync("IDIOMA_RESPUESTA", "ES");
        parametrosEntrada.putSync("URL_BANORTE", "https://via.pagosbanorte.com/InterredesSeguro");
        
        try {
            let resultado = {}
            module.exports.banorte.logger.log('info', `[${module.exports.banorte.banco}] ENV: ${pinpadEnv}`)
            
            process.pinpadInstance.procesarTransaccionSync(parametrosEntrada, parametrosSalida)

            let inicioTransaccion = moment(parametrosSalida.getSync('FECHA_REQ_CTE'), 'YYYY/MM/DD HH:mm:SS').toISOString()
            let finTransaccion = moment(parametrosSalida.getSync('FECHA_RSP_CTE'), 'YYYY/MM/DD HH:mm:SS').toISOString()

            let [anioExp, mesExp] = ['00', '00']
            try {
                [anioExp, mesExp] = parametrosSalida.getSync('FECHA_EXP').match(/.{1,2}/g)
            } catch(e) {

            }
            

            switch(parametrosSalida.getSync('RESULTADO_PAYW')) {
                // APROBADA
                case 'A':
                    resultado = {
                        status:'success',
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        integracion: module.exports.banorte.banco,
                        datos: {
                            autorizacion: parametrosSalida.getSync('CODIGO_AUT'),
                            resultadoTransaccion: 'aprobada',
                            mensaje: parametrosSalida.getSync('TEXTO'),
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            referencia: parametrosSalida.getSync('REFERENCIA'),
                            tarjetahabiente: (parametrosSalida.getSync('TARJETAHABIENTE') || '').trim(),
                            inicioTransaccion: inicioTransaccion,
                            finTransaccion: finTransaccion,
                            metodoEntrada: parametrosSalida.getSync('MODO_ENTRADA'),
                            noTarjeta: parametrosSalida.getSync('NUMERO_TARJETA'),
                            tipoTarjeta: parametrosSalida.getSync('TIPO_TARJETA'),
                            bancoEmisor: parametrosSalida.getSync('BANCO_EMISOR'),
                            afiliacion: parametrosSalida.getSync('ID_AFILIACION') || '',
                            tvr: parametrosSalida.getSync('TVR') || '',
                            tsi: parametrosSalida.getSync('TSI') || '',
                            aid: parametrosSalida.getSync('AID') || '',
                            al: parametrosSalida.getSync('AL') || '',
                            apn: parametrosSalida.getSync('APN') || '',
                            mesExp: mesExp,
                            anioExp: anioExp,
                            tagsEmv: parametrosSalida.getSync('TAGS_EMV') || '',
                            capturaNip: Boolean(+parametrosSalida.getSync('CAPTURA_NIP')),
                            datosEmv: parametrosSalida.getSync('DATOS_EMV'),
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                            importe: importe,
                        }
                    }
                    break;

                // DECLINADA
                case 'D':
                    let resultadoTransaccion = 'Declinada EMV'
                    let tagsEmv = ''

                    if (parametrosSalida.getSync('DECLINADA_CHIP') && parametrosSalida.getSync('DECLINADA_CHIP') == "1") {
                        resultadoTransaccion = 'Declinada Offline'
                    }
                    
                    tagsEmv = parametrosSalida.getSync('TAGS_EMV')

                    resultado = {
                        status: 'error',
                        declinada: true,
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        integracion: module.exports.banorte.banco,
                        datos: {
                            mensaje: parametrosSalida.getSync('TEXTO'),
                            referencia: parametrosSalida.getSync('REFERENCIA'),
                            resultadoTransaccion: resultadoTransaccion,
                            declinadaChip: parametrosSalida.getSync('DECLINADA_CHIP'),
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            datosEmv: parametrosSalida.getSync('DATOS_EMV'),
                            afiliacion: parametrosSalida.getSync('ID_AFILIACION'),
                            tagsEmv: tagsEmv,
                            aid: parametrosSalida.getSync('AID') || '',
                            tvr: parametrosSalida.getSync('TVR') || '',
                            al: parametrosSalida.getSync('AL') || '',
                            apn: parametrosSalida.getSync('APN') || '',
                            inicioTransaccion: inicioTransaccion,
                            finTransaccion: finTransaccion,
                            respuesta: parametrosSalida.toString(),
                            terminal: module.exports.banorte._numeroSerie,
                            marcaTarjeta: parametrosSalida.getSync('MARCA_TARJETA'),
                            bancoEmisor: parametrosSalida.getSync('BANCO_EMISOR'),
                            mesExp: mesExp,
                            anioExp: anioExp,
                            tipoTarjeta: parametrosSalida.getSync('TIPO_TARJETA'),
                            metodoEntrada: parametrosSalida.getSync('MODO_ENTRADA'),
                            noTarjeta: parametrosSalida.getSync('NUMERO_TARJETA'),
                            importe: importe,
                        }
                    }
                    break;

                default:
                    module.exports.banorte.logger.log('error', parametrosSalida.getSync('TEXTO'))
                    resultado = {
                        status: 'error',
                        mensaje: parametrosSalida.getSync('TEXTO'),
                        integracion: module.exports.banorte.banco,
                        datos: {
                            resultadoTransaccion: 'Error',
                            referencia: parametrosSalida.getSync('REFERENCIA'),
                            mensaje: parametrosSalida.getSync('TEXTO'),
                            afiliacion: parametrosSalida.getSync('ID_AFILIACION'),
                            marcaTarjeta: parametrosSalida.getSync('MARCA_TARJETA'),
                            numeroControl: parametrosSalida.getSync('NUMERO_CONTROL'),
                            tvr: parametrosSalida.getSync('TVR') || '',
                            datosEmv: parametrosSalida.getSync('DATOS_EMV'),
                            inicioTransaccion: inicioTransaccion,
                            finTransaccion: finTransaccion,
                            respuesta: parametrosSalida.toString(),
                            mesExp: mesExp,
                            anioExp: anioExp,
                            terminal: module.exports.banorte._numeroSerie,
                            importe: importe,
                        }
                    }
                    break;

            }

            return resultado
        } catch(e) {
            let errMsg = e.message || String(e)
            module.exports.banorte.logger.log('error', errMsg)
            if (errMsg.indexOf('verifique que exista y esté libre') > -1) {
                return {
                    status: 'error',
                    mensaje: 'Falla al intentar inicializar puerto; verifique que exista y esté libre.'
                }
            }

            if (errMsg.indexOf('Transacción cancelada por el usuario') > -1) {
                return {
                    status: 'error',
                    mensaje: 'Transacción cancelada por el usuario'
                }
            }

            if (errMsg.indexOf('Tarjeta ha sido retirada antes de tiempo') > -1) {
                return {
                    status: 'error',
                    mensaje: 'La tarjeta ha sido retirada antes de tiempo'
                }
            }

            if (errMsg.indexOf('disponibilidad de conexión al banco') > -1) {
                return {
                    status: 'error',
                    mensaje: 'Verifique su conexión a internet, problemas en la comunicación con el banco.'
                }
            }

            if (errMsg.indexOf('No se recibió respuesta de la pinpad en el tiempo máximo') > -1) {
                return {
                    status: 'error',
                    mensaje: 'No se recibió respuesta de la pinpad en el tiempo máximo permitido.'
                }
            }

            module.exports.banorte.logger.log('error', {
                status: 'error',
                integracion: module.exports.banorte.banco,
                mensaje: JSON.stringify(e)
            })

            return {
                status: 'error',
                integracion: module.exports.banorte.banco,
                mensaje: JSON.stringify(e)
            }
        }
    },

    getInfoCobro: (cobroPinpad) => {
        if (cobroPinpad.status !== 'success') {
            return cobroPinpad
        }

        return {
            cobroTarjeta: cobroPinpad,
            status: cobroPinpad.status,
            integracion: module.exports.banorte.banco,
            datos: {
                tipo_tarjeta: cobroPinpad.datos.tipoTarjeta,
                no_tarjeta: cobroPinpad.datos.noTarjeta,
                numeroControl: cobroPinpad.datos.numeroControl,
                resultadoTransaccion: cobroPinpad.datos.resultadoTransaccion,
                noTarjeta: cobroPinpad.datos.noTarjeta,
                finTransaccion: cobroPinpad.datos.finTransaccion,
                autorizacion: cobroPinpad.datos.autorizacion,
                tarjetahabiente: cobroPinpad.datos.tarjetahabiente.trim(),
                importe: cobroPinpad.datos.importe,
                terminal: cobroPinpad.datos.terminal,
                referencia: cobroPinpad.datos.referencia,
                respuesta: cobroPinpad.datos.respuesta,
                mesExp: cobroPinpad.datos.mesExp,
                anioExp: cobroPinpad.datos.anioExp,

                bancoEmisor: cobroPinpad.datos.bancoEmisor,
                afiliacion: cobroPinpad.datos.afiliacion,
                tsi: cobroPinpad.datos.tsi,
                aid: cobroPinpad.datos.aid,
                tvr: cobroPinpad.datos.tvr,
                al: cobroPinpad.datos.al,
                apn: cobroPinpad.datos.apn,
                tagsEmv: cobroPinpad.datos.tagsEmv,
                capturaNip: cobroPinpad.datos.capturaNip,
            }
        }
    },
    recargarInstancia: (conf) => {
        if (!process.pinpadInstance) {
            return true
        }

        return !(
            module.exports.banorte._props.banco == conf.banco &&
            module.exports.banorte._props.noAfiliacion == conf.noAfiliacion &&
            module.exports.banorte._props.modoPruebas == conf.modoPruebas &&
            module.exports.banorte._props.usuario == conf.usuario &&
            module.exports.banorte._props.password == conf.password
        );
    }
}