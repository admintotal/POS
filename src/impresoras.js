import nw from 'nw.gui'
import pjson from '../package.json'
import {serializeUri} from './helpers'
import {store as configureStore} from './index'

let isDev = pjson.env !== 'production'

/* 
docs: http://docs.nwjs.io/en/nw14/References/Window/#winprintoptions
*/
const getConfImpresora = () => {
	/*
	let origMediaSize = {
		"custom_display_name": "A4 Fit Width 100%",
		"height_microns": 297039,
		"vendor_id": "95A4",
		"width_microns": 209903
	}
	*/
	try {
		let store = configureStore.getState()
		let impresora = store.app.configuracion.impresora

		return {
			marginsType: 1,
			printer: impresora.deviceName,
			shouldPrintBackgrounds: impresora.shouldPrintBackgrounds,
			mediaSize: impresora.mediaSize
		}
	} catch (e) {
		console.error(e)
		return {}
	}
}

const imprimirUrl = (url, winConf={show: isDev}) => {
	nw.Window.open(url, winConf, win => {
		win.on('loaded', () => {
			if (! isDev ) {
				win.print(getConfImpresora());
				setTimeout(() => { win.close() }, 10000);
			}
		})
	})
}

export const obtenerImpresoras = () => {
	return new Promise((resolve, reject) => {
		const win = nw.Window.get()
		win.getPrinters((impresoras) => {
	        resolve(impresoras)
	    })	
	})
}

export const imprimirReciboVenta = (idVenta, api_key, opts) => {
	return new Promise((resolve, reject) => {
		let url = `http://localhost:3131/api/imprimir/recibo-venta/${idVenta}?api_key=${api_key}`
		if (opts && opts.url) {
			let qs = opts.conf
			qs.api_key = api_key
			url = opts.url + `&${serializeUri(qs)}`
		}
		imprimirUrl(url)
	})
}

export const imprimirReciboPago = (idPago, api_key, opts) => {
	return new Promise((resolve, reject) => {
		let url = `http://localhost:3131/api/imprimir/recibo-pago/${idPago}?api_key=${api_key}`
		if (opts && opts.url) {
			let qs = opts.conf
			qs.api_key = api_key
			url = opts.url + `&${serializeUri(qs)}`
		}
		imprimirUrl(url)
	})
}

export const imprimirVoucher = (idVenta, api_key, data={}) => {
	let {tipo, cobroId, re} = data
	if (!re) {
		re = ''
	}
	return new Promise((resolve, reject) => {
		let url
		if (!cobroId) {
			url = `http://localhost:3131/api/imprimir/voucher-venta/${idVenta}/${tipo}?api_key=${api_key}`
		} else {
			url = `http://localhost:3131/api/imprimir/voucher-venta/${idVenta}/${tipo}/${cobroId}?api_key=${api_key}`
		}
		url += `&re=${re}&${data.recepcion_pago ? 'recepcion_pago=1': ''}`
		imprimirUrl(url)
	})
}

export const imprimirVoucherTransaccion = (idTransaccion, api_key, tipo) => {
	return new Promise((resolve, reject) => {
		let url = `http://localhost:3131/api/imprimir/voucher-transaccion/${idTransaccion}/${tipo}?api_key=${api_key}`
		imprimirUrl(url)
	})
}

export const imprimirVoucherPago = (idPago, api_key, tipo) => {
	return new Promise((resolve, reject) => {
		let url = `http://localhost:3131/api/imprimir/voucher-pago/${idPago}/${tipo}?api_key=${api_key}`
		imprimirUrl(url)
	})
}

export const imprimirFondoCaja = (tipo, api_key, id) => {
	return new Promise((resolve, reject) => {
		let url = `http://localhost:3131/api/imprimir/fondo-caja/${tipo}/${id}?api_key=${api_key}`
		imprimirUrl(url)
	})
}

export const imprimirCortePinPad = (api_key, id) => {
	return new Promise((resolve, reject) => {
		let url = `http://localhost:3131/api/imprimir/corte-pinpad/${id}?api_key=${api_key}`
		imprimirUrl(url)
	})
}

export const imprimirRetiroEfectivo = (api_key, id) => {
	return new Promise((resolve, reject) => {
		let url = `http://localhost:3131/api/imprimir/retiro-efectivo/${id}?api_key=${api_key}`
		imprimirUrl(url)
	})
}

export const imprimirHojaPrueba = (api_key, impresora) => {
	return new Promise((resolve, reject) => {
		let url = `http://localhost:3131/api/imprimir-hoja-prueba?api_key=${api_key}`
		imprimirUrl(url)
		resolve()
	})
}