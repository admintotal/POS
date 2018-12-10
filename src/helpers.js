import nw from 'nw.gui'
import pjson from '../package.json'
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