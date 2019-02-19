import nw from 'nw.gui'
import pjson from '../package.json'
import moment from 'moment'
import {store as configureStore} from './index'

export const isEnv = (env) => {
	return pjson.env === env;
}

export const serializeUri = (obj) => {
	var str = [];

	for (var p in obj) {
		if (obj.hasOwnProperty(p)) {
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
		}
	}
	
	return str.join("&");
}

export const kioskMode = (enable=true) => {
    if (enable) {
        nw.Window.get().enterKioskMode();
    } else {
        nw.Window.get().leaveKioskMode();
    }
}

export const maximize = () => {
    kioskMode(false)
	nw.Window.get().maximize()
}

export const truncate = (s, n) => {
	return (s.length > n) ? s.substr(0, n-1) + '...' : s;
}

export const cloneObject = (obj) => {
    return JSON.parse(JSON.stringify(obj))
}

export const arrayDiff = (a, b) => {
    return a.filter((i) => {
        return b.indexOf(i) < 0;
    });
};

export const toDecimal = (num) => {
	if(!num) return 0;
	num = parseFloat(num.toString().replace(/\$|,/g,''));
	if(isNaN(num)) return 0; 
	else return num;
}

export const precisionDecimales = (valor, precision) => {
    if( ! precision ){
        let store = configureStore.getState()
        precision = store.app.configuracion.general.precision_decimales
    }
    
    var p = Math.pow(10, precision)
        
    try {
        return Math.round(toDecimal(toDecimal(valor)*p).toFixed(precision))/p;    
    } catch(error) {
        return Math.round(toDecimal(valor))
    }
}

export const redondeo = (pu) => {
	let store = configureStore.getState()
    let redondeos = store.app.configuracion.facturacion.redondeos_precio_venta
    pu = toDecimal(pu);
    let precio = pu;

    pu = toDecimal(pu.toFixed(2));

    redondeos.map((r, i) => {
        let hasta = toDecimal(r.hasta);
        let factor_redondeo = toDecimal(r.factor_redondeo);
        
        if (pu <= hasta) {
            if( r.tipo_redondeo === 1){
                precio = factor_redondeo * Math.round(pu/factor_redondeo);
            }else if(r.tipo_redondeo === 2){
                precio = factor_redondeo * Math.ceil(pu/factor_redondeo);
            }else if(r.tipo_redondeo === 3){
                precio = factor_redondeo * Math.floor(pu/factor_redondeo);
            }
        }
        
        return false;
    })

    return precio;
}

export const getClienteObj = (obj) => {
    return {
        id: obj.id,
        razon_social: obj.razon_social,
        rfc: obj.rfc
    }
}

export const getAlmacenObj = (obj) => {
    return {
        id: obj.id,
        nombre: obj.nombre,
        codigo: obj.codigo,
    }
}

export const getSesionCajaObj = (obj) => {
    return {
        _id: obj._id,
        fecha: obj.fecha,
        totalFondo: obj.totalFondo,
        cajero: {
            id: obj.cajero.id,
            username: obj.cajero.username,
            claveCliente: obj.cajero.claveCliente,
        },
        almacen: {
            id: obj.almacen.id,
            nombre: obj.almacen.nombre,
            codigo: obj.almacen.codigo,
        },
    }
}

export const getNumeroTarjeta = (numero) => {
    if (!numero || numero === '') {
        return ''
    }

    return  `${numero}`.substr(`${numero}`.length - 4);
}

export const getProductoObj = (obj) => {
    return {
        id: obj.id,
        codigo: obj.codigo,
        descripcion: obj.descripcion,
        imagen: obj.imagen,
        precio_neto: obj.precio_neto,
        precio_venta: obj.precio_venta,
        promocion: obj.promocion,
        complementario: obj.complementario,
        um: {
            id: obj.um.id,
            nombre: obj.um.nombre,
            factor: obj.um.factor,
        },
        linea_id: obj.linea_id,
        sublinea_id: obj.sublinea_id,
        subsublinea_id: obj.subsublinea_id,
    }
}

export const getPrecioNeto = ({producto, cantidad}) => {
    let factorum = +producto.um.factor || 1
    let cantidadFactor = cantidad * factorum
    let precio_neto = precisionDecimales(producto.precio_neto) * factorum

    if (producto.promociones) {
        let hoy = moment()
        let promos = producto.promociones.slice()

        promos.sort((a, b) => {
            if (+a.cantidad < +b.cantidad)
                return -1;
            
            if (+a.cantidad > +b.cantidad)
                return 1;

            return 0;
        })
        
        promos.forEach((promo) => {
            // validamos la fecha de vencimiento de la promoción
            if (promo.vencimiento && promo.vencimiento !== "") {
                let vencimiento = moment(promo.vencimiento, "DD/MM/YYYY").endOf('day')
                if (! hoy.isSameOrBefore(vencimiento) ) {
                    return precio_neto
                }
            }

            if (cantidadFactor >= +(promo.cantidad)) {
                if (precisionDecimales(promo.precio_neto * factorum) < precio_neto) {
                    precio_neto = precisionDecimales(promo.precio_neto * factorum)
                }
            }
        })
    }

    return precio_neto  
}

export const getHorasEntrega = () => {
    let opciones_hora = []
    for (let x = 80; x <= 220; x += 5) {
        opciones_hora.push({
            id: x,
            texto: String(x).endsWith("5") ? `${String(x).replace(/.$/,":30")}` : `${String(x).replace(/.$/,":00")}`
        })
    }
    return opciones_hora
}

export const getHoraEntrega = (hora) => {
    let horas = getHorasEntrega()
    let h = horas.find((e) => {
        return +e.id === +hora
    })

    if (h) {
        return h.texto
    }

    return null
}

export const getStateTotales = (state) => {
    let total = 0
    let totalDescuento = 0
    let totalArticulos = 0
    let solicitiarRecarga = false
    let pagoServicioLdi = false

    const _get_acumulado = (state) => {
        let acumulado = 0
        let comision = 0

        if (!state.productos.length) {
            return {acumulado: 0, comision: 0} 
        }
        
        if (state.efectivo && state.efectivo.monto) {
            acumulado += state.efectivo.monto
        }

        if (state.tarjeta && state.tarjeta.monto) {
            acumulado += state.tarjeta.monto
            comision += state.tarjeta.monto_comision || 0
        }

        if (state.fondo && state.fondo.monto) {
            acumulado += state.fondo.monto
        }

        if (state.monedero && state.monedero.monto) {
            acumulado += state.monedero.monto
        }

        if (state.transferencia && state.transferencia.monto) {
            acumulado += state.transferencia.monto
        }

        if (state.cheque && state.cheque.monto) {
            acumulado += state.cheque.monto
        }

        // return {acumulado: +(acumulado.toFixed(2)), comision: +(comision.toFixed(2))}
        return {acumulado: precisionDecimales(acumulado), comision: precisionDecimales(comision)}
    }

    let {acumulado, comision} = _get_acumulado(state)

    state.productos.map((p) => {
        totalArticulos += p.cantidad
        total += p.importe
        totalDescuento += (p.descuento * p.cantidad)
        
        if (p.es_recarga) {
            solicitiarRecarga = true
        }

        if (p.es_servicio_ldi) {
            pagoServicioLdi = true
        }

        if (p.descuentoAutorizadoImporte) {
            totalDescuento += p.descuentoAutorizadoImporte
        }

        return null
    })
    
    return {
        total: precisionDecimales(total + comision, 2),
        totalDescuento: precisionDecimales(totalDescuento),
        totalArticulos: totalArticulos,
        comision: comision || 0,
        aCobrar: acumulado,
        pagoServicioLdi: pagoServicioLdi,
        solicitiarRecarga: solicitiarRecarga,
        cambio: precisionDecimales(acumulado - (total + comision), 2),
    }
}

export const getProductoInline = (data, um) => {
    let obj = data.producto
    let cant = data.cantidad
    let descuento = 0
    let es_recarga = data.es_recarga

    if (um) {
        obj.um = um
    } 

    if (!obj.um) {
        obj.um = {}
    }

    let factorum = +obj.um.factor || 1
    let precio_regular = precisionDecimales(obj.precio_neto) * factorum
    let precio_neto = getPrecioNeto({producto: obj, cantidad: cant})

    if (es_recarga) {
        precio_neto = precisionDecimales(obj.recarga_saldo_importe, 2)
        precio_regular = precio_neto
    }

    descuento = (precio_regular - precio_neto)

    let es_servicio_ldi = false
    
    if (data.es_servicio_ldi && obj.servicio_ldi_monto) {
        es_servicio_ldi = true
        precio_neto = obj.servicio_ldi_monto
        // comision
        if (obj.complementario) {
            precio_regular = precio_neto
        }
    }

    let importe = precisionDecimales(+precio_neto * cant, 2)
    let descuentoAutorizadoImporte = 0
    
    if (data.descuentoAutorizado) {
        descuentoAutorizadoImporte = (data.descuentoAutorizado * importe / 100)
        importe = importe - descuentoAutorizadoImporte
    }

    return {
        importe: importe,
        cantidad: cant,
        producto: obj,
        precio_regular: precisionDecimales(precio_regular, 2),
        precio_neto: precisionDecimales(precio_neto, 2),
        es_recarga: es_recarga,
        es_servicio_ldi: es_servicio_ldi,
        numeroTelefonico: data.numeroTelefonico,
        descuento: descuento,
        descuentoAutorizado: data.descuentoAutorizado,
        descuentoAutorizadoImporte: descuentoAutorizadoImporte,
        promociones: obj.promociones,
        activo: obj.activo,
        deshabilitarCantidad: data.deshabilitarCantidad,
        deshabilitarBorrado: data.deshabilitarBorrado,
    }
}