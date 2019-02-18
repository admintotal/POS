import React from 'react';
import formatCurrency from 'format-currency';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Autocomplete from 'react-autocomplete';
import InlineProductoComponent from './InlineProductoComponent';
import TotalesComponent from './TotalesComponent';
import TituloComponent from './TituloComponent';
import FechaEntregaComponent from './FechaEntregaComponent';
import CobrosTarjetaComponent from './CobrosTarjetaComponent';
import PromocionesProductoComponent from './PromocionesProductoComponent';
import * as Api from '../api';
import { 
    ClienteAutocompleteView, 
    ProductoAutocompleteView, 
    MenuAutocompleteView 
} from '../constants/AutocompleteTemplates';
import { 
    seleccionarDireccionEntrega, 
    //autocompleteProducto, 
    //autocompleteCliente, 
    seleccionarCliente, 
    seleccionarProducto,
    seleccionarMetodoPago,
    entregarDomicilio,
    requerirFactura,
    eliminarProducto,
    guardarVenta,
    setUmProducto,
    actualizarProductoInline,
    seleccionarUsoCFDI,
    setVentaEspera,
    cargarVentaEspera,
    eliminarVentaEspera,
    setClienteAc,
    infoExtraChange,
    setProductosAc,
    setClientesAc,
    nuevaVenta,
    changeTipoPago,
    toggleOtraTerminalProsepago,
    concluirVenta,
    setProp,
    seleccionarPinpad
} from '../actions/puntoVentaActions';
import { 
    cargando,
    mensajeFlash,
    cerrarVenta,
    autocompleteProducto,
    autocompleteCliente,
    mostrarAlerta
} from '../actions';
import { Link } from 'react-router-dom';
import { Shortcuts } from 'react-shortcuts';
import { history } from '../index';
import {
    precisionDecimales, 
    getClienteObj, 
    getSesionCajaObj, 
    getProductoObj
} from '../helpers';
import Draggable from 'react-draggable';
import moment from 'moment';
import sanitizeHtml from 'sanitize-html';
import * as Impresora from '../impresoras';

import InputNumber from 'rc-input-number';
import '../../node_modules/rc-input-number/assets/index.css';

class PuntoVentaComponent extends React.Component {
    constructor(props) {
        super(props);

        let integracionPinpad = null
        if (props.configuracion.pinpad && props.configuracion.pinpad.banco) {
            integracionPinpad = props.configuracion.pinpad.banco.toLowerCase()
        }

        this.state = {
            ...props,
            integracionPinpad: integracionPinpad,
            cantidad: 1,
            ac_cliente: '',
            ac_producto: '',
            metodoPagoModal: null,
            modalRecarga: null,
            modalAutorizacion: null,
            modalUmProducto: null,
            modalPromocionesProducto: null,
            modalEditarProducto: null,
            modalServicioLdi: null,
            existenciasAlmacen: null,
            modalFechaEntrega: {},
            cobrosTarjeta: {
                visible: false
            },
            guardar: {
                habilitado: true,
                texto: 'Guardar e imprimir'
            }
        }

        this.timeoutId = null
        this.timeoutIdCliente = null
    }

    handleSeleccionarDireccionEntrega(ev) {
        let id = ev.target.value;
        this.props.seleccionarDireccionEntrega(id)
    }

    renderDirecciones(direcciones) {
        const ds = [];
        if (direcciones) {
            direcciones.map(direccion => {
                return ds.push(
                    <option value={direccion.id} key={`direccion-${direccion.id}`}>
                        {direccion.direccion_completa}
                    </option>
                );
            });
        }

        return (
            <select className="form-control" onChange={this.handleSeleccionarDireccionEntrega.bind(this)}>
                <option value="">Mismo Lugar</option>
                {ds}
            </select>
        );
    }

    onChangeCliente(ev) {
        if (ev.target.value) {

            if (this.props.tarjeta.cobros && this.props.tarjeta.cobros.length) {
                return this.props.mostrarAlerta({
                    mensaje: 'No se puede modificar el cliente cuando un cobro de tarjeta ya ha sido realizado.'
                })
            }

            let {autocompleteCliente, api_key} = this.props
            let q = ev.target.value
            clearTimeout(this.timeoutIdCliente)
            this.timeoutIdCliente = setTimeout(() => {
                autocompleteCliente('SET_PV_AUTOCOMPLETE_CLIENTE', api_key, q)
                // autocompleteCliente(api_key, q)
            }, 600);
        }

        this.props.setClienteAc(ev.target.value)
        this.setState({...this.state, ac_cliente: ev.target.value});
    }

    onSelectCliente(value, obj={}) {
        clearTimeout(this.timeoutIdCliente)

        let porCodigo = Boolean(value) && !obj.id
        let productos = this.props.productos.map((p) => {
            return p.producto.id
        })
        
        this.props.cargando()
        this.props.setClienteAc('')
        this.setState({...this.state, ac_cliente: ''})

        Api.getCliente(this.props.api_key, obj.id || value, porCodigo, productos).then((res) => {
            this.props.seleccionarCliente(res.object, res.productos)
            this.props.setClienteAc(res.object.razon_social)
            this.setState({...this.state, ac_cliente: res.object.razon_social})
            if (this.productoInput) {
                this.productoInput.focus()
            }

            if (!res.internetDisponible) {
                this.props.mensajeFlash('error', 'Problemas al consultar el crédito del cliente.')
            }

            this.props.cargando(false)
        })
        .catch((err) => {
            if (err.object) {
                this.props.seleccionarCliente(err.object, err.productos)
                this.props.setClienteAc(err.object.razon_social)
                this.setState({...this.state, ac_cliente: err.object.razon_social})
            }

            this.props.cargando(false)
            clearTimeout(this.timeoutIdCliente)
            this.props.mensajeFlash('error', err.message)
          
            if (this.clienteInput) {
                this.clienteInput.select()
            }
        })
    }

    onChangeProducto(ev) {
        if (ev.target.value) {
            if (this.props.tarjeta.cobros && this.props.tarjeta.cobros.length) {
                return this.props.mostrarAlerta({
                    mensaje: 'No se pueden agregar más productos cuando un cobro de tarjeta ya ha sido realizado.'
                })
            }

            let {autocompleteProducto, api_key} = this.props
            let idAlmacen = this.props.sesionCaja.almacen.id
            let q = ev.target.value
            clearTimeout(this.timeoutId)
            this.timeoutId = setTimeout(() => {
                autocompleteProducto('SET_PV_AUTOCOMPLETE_PRODUCTO', api_key, q, idAlmacen)
                // autocompleteProducto(api_key, q, idAlmacen)
            }, 1200);
        }
        
        this.setState({...this.state, ac_producto: ev.target.value})
    }

    getProductoInline(cant=this.state.cantidad, obj) {
        let es_recarga = Number(obj.recarga_saldo_importe) > 0
        let es_servicio_ldi = Number(obj.ldi_servicio_id) > 0
        return {
            cantidad: cant, 
            es_recarga: es_recarga,
            es_servicio_ldi: es_servicio_ldi,
            producto: obj
        }
    }

    onSelectProducto(value, obj={}, cant=this.state.cantidad) {
        cant = Number(cant)
        let porCodigo = Boolean(value) && !obj.id
        let cacheProds = []

        clearTimeout(this.timeoutId)

        this.setState({...this.state, ac_producto: '', cantidad: 1})

        if (!cant) {
            return this.props.mostrarAlerta({mensaje: 'La cantidad no puede ser 0.'})
        }

        if (this.props.configuracion.inventario.facturar_sin_existencia === false) {
            this.props.productos.forEach((p) => {
                // cacheProds.push(p.producto.id)
            })
        }


        // consultamos el producto a la base de datos,
        // en caso de que el producto se pueda usar con la báscula
        // nos regresara la cantidad obtenida por la báscula.
        Api.getProducto(this.props.api_key, obj.id || value, porCodigo, cacheProds, this.props.cliente.id).then((res) => {
            if (res.mensajeFlash) {
                this.props.mensajeFlash(res.mensajeFlash.tipo, res.mensajeFlash.mensaje)
            }

            let producto = res.producto

            if (producto.restringir_decimales && !Number.isInteger(cant)) {
                this.props.mostrarAlerta({
                    mensaje: `La cantidad del producto <b>${producto.descripcion}</b> no puede contener decimales.`
                })

                return false
            }
            
            let existenciasAlmacen = null
            if (producto.existenciasAlmacen) {
                existenciasAlmacen = {
                    producto: producto,
                    existencias: producto.existenciasAlmacen
                }
            } 

            this.setState({
                existenciasAlmacen: existenciasAlmacen
            })

            if (res.productoCantidad) {
                cant = res.cantidad
            }
            
            if (this.props.configuracion.facturacion.usa_margen_utilidad_minimo && producto.precio_minimo_at) {
                if (+producto.precio_minimo > +producto.precio_venta) {
                    // no vender bajo el margen
                    if (+producto.vender_menos_margen_utilidad === 0) {
                        this.props.mostrarAlerta({
                            mensaje: `El precio mínimo para el producto <b>${producto.descripcion}</b> es de <b>$${formatCurrency(producto.precio_minimo)}</b>.`
                        })

                        return false
                    }
                    
                    // bajo autorización
                    let cajero = this.props.sesionCaja.cajero
                    if (+producto.vender_menos_margen_utilidad === 2) {
                        producto.debajoMargen = true

                        if (!cajero.autorizaciones.autorizacion_vender_debajo_mu) {
                            return this.setState({
                                modalAutorizacion: {
                                    producto: producto,
                                    cantidad: cant,
                                    mensajeWarning: `El producto <b>${producto.codigo}</b> se venderá por debajo del margen de utilidad.`,
                                    tipo_autorizacion: 'autorizacion_vender_debajo_mu'
                                }
                            })
                        }
                    }
                }
            }

            producto = this.getProductoInline(cant, producto)
            
            if (producto.es_recarga) {
                // verifica la conexión a internet
                Api.checkInternetConnection().then(() => {
                    return this.setState({
                        ac_producto: '', 
                        cantidad: 1,
                        modalRecarga: {
                            titulo: producto.producto.descripcion,
                            producto: producto
                        }
                    })
                })
                .catch(() => {
                    this.props.mensajeFlash('error', 'Es necesaria la conexión a internet para solicitar recargas.')
                })
            } else if (producto.es_servicio_ldi) {
                // verifica la conexión a internet
                Api.checkInternetConnection().then(() => {
                    return this.setState({
                        ac_producto: '', 
                        cantidad: 1,
                        modalServicioLdi : {
                            titulo: producto.producto.descripcion,
                            producto: producto
                        }
                    })
                })
                .catch(() => {
                    this.props.mensajeFlash('error', 'Es necesaria la conexión a internet para solicitar recargas.')
                })
            } else {
                if (producto.producto.validarExistencia) {
                    let cantidad = producto.cantidad
                    let existencia = producto.producto.existencia
                    
                    this.props.productos.forEach((p) => {
                        if (p.producto.id === producto.producto.id) {
                            cantidad += p.cantidad
                        }
                    })
                    
                    producto.producto.existenciaAt = existencia
                    
                    if (cantidad > existencia) {
                        return this.props.mostrarAlerta({
                            titulo: 'Error de validación',
                            mensaje: `El producto <b>${producto.producto.descripcion}</b> cuenta con <b>${existencia}</b> existencias.`
                        })
                    }
                }
                
                this.props.seleccionarProducto(producto)
            }
             
        })
        .catch((err) => {
            // alert(err.message || 'Hubo un error al seleccionar el producto')
            this.props.mostrarAlerta({
                titulo: 'Error al seleccionar el producto',
                mensaje: err.message || 'Hubo un error al seleccionar el producto'
            })
            // this.props.mensajeFlash('error', err.message || 'Hubo un error al seleccionar el producto', 6000)
        })
    }

    togglePromocionProducto(producto) {
        if (!this.state.modalPromocionesProducto) {
            this.setState({
                modalPromocionesProducto: {
                    producto: producto
                }
            })
        } else {
            this.setState({
                modalPromocionesProducto: null
            })
        }
    }

    seleccionarClienteDefault() {
        let clienteDefault = this.props.configuracion.facturacion.cliente_mostrador_default;
        this.props.setClienteAc(clienteDefault.razon_social)
        this.setState({
            ac_cliente: clienteDefault.razon_social
        })

        this.props.seleccionarCliente(clienteDefault)
    }

    _handleShortcuts(action, event) {
        const {facturacion} = this.props.configuracion

        switch (action) {
          case 'INGRESAR_PAGO_EFECTIVO':
            if (!facturacion.metodo_pago_efectivo) {
                return this.props.mostrarAlerta({mensaje:'Los pagos en efectivo no están habilitados.'})
            }
            this.mostrarModalPago('efectivo')
            break

          case 'INGRESAR_PAGO_CHEQUE':
            if (!facturacion.metodo_pago_cheque) {
                return this.props.mostrarAlerta({mensaje:'Los pagos con cheque no están habilitados.'})
            }
            this.mostrarModalPago('cheque')
            break

          case 'INGRESAR_PAGO_TARJETA':
            if (!facturacion.metodo_pago_tarjeta) {
                return this.props.mostrarAlerta({mensaje:'Los pagos con tarjeta no están habilitados.'})
            }
            this.mostrarModalPago('tarjeta')
            break

          case 'INGRESAR_PAGO_TRANSFERENCIA':
            if (!facturacion.metodo_pago_transferencia) {
                return this.props.mostrarAlerta({mensaje:'Los pagos con transferencia no están habilitados.'})
            }
            this.mostrarModalPago('transferencia')
            break

          case 'INGRESAR_PAGO_FONDO':
            if (!facturacion.metodo_pago_fondo) {
                return this.props.mostrarAlerta({mensaje:'Los pagos con fondo no están habilitados.'})
            }
            this.mostrarModalPago('fondo')
            break

          case 'GUARDAR_VENTA':
            this.guardar()
            break

          case 'FOCUS_INPUT_PRODUCTO':
            if (this.productoInput) {
                event.preventDefault()
                this.productoInput.focus()
                return 
            }
            break

          case 'FOCUS_INPUT_CLIENTE':
            if (this.clienteInput) {
                event.preventDefault()
                this.clienteInput.focus()
                this.clienteInput.select()
                return 
            }
            break

          case 'VERIFICADOR_PRECIOS':
            history.push('/verificador-precios')
            break

          case 'MOSTRAR_ATAJOS':
            let mensaje = `
                <table class="table table-striped table-condensed">
                    <thead>
                        <tr>
                            <th>Atajo</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>F1</td>
                            <td>Pago Efectivo</td>
                        </tr>
                        <tr>
                            <td>F2</td>
                            <td>Pago Cheque</td>
                        </tr>
                        <tr>
                            <td>F3</td>
                            <td>Pago Tarjeta</td>
                        </tr>
                        <tr>
                            <td>F4</td>
                            <td>Pago Transferencia</td>
                        </tr>
                        <tr>
                            <td>F9</td>
                            <td>Verificador de precios</td>
                        </tr>
                        <tr>
                            <td>F10</td>
                            <td>Enfoque buscador de cliente</td>
                        </tr>
                        <tr>
                            <td>F12</td>
                            <td>Guardar venta</td>
                        </tr>
                    </tbody>
                </table>
            `
            this.props.mostrarAlerta({
                mensaje: mensaje,
                titulo: 'Atajos Punto de Venta'
            })
            break

          case 'BLUR':
            if (this.state.metodoPagoModal) {
                this.setState({
                    metodoPagoModal: null
                })
            }

            if (this.productoInput) {
                return this.productoInput.focus()
            }

            break

          default:
            break;
        }
    }

    componentDidMount() {
        let ventaId = this.props.ventaId
        if (ventaId) {
            let {concluirVenta} = this.props
            this.props.cerrarVenta()

            Api.obtenerVenta(this.props.api_key, ventaId)
            .then((res) => {
                if (res.status !== 'success') {
                    return this.props.mensajeFlash('error', res.message)
                }
                
                concluirVenta(res.venta)
            })
            .catch((err) => {
                this.props.mensajeFlash('error', err.message)
            })
        } else {
            if (this.props.cliente.razon_social) {
                this.setState({
                    ac_cliente: this.props.cliente.razon_social,
                })
            } else {
                this.seleccionarClienteDefault()
            }
        }

        this.productoInput.focus()
    }

    selectOnFocus (event) {
      event.target.select();
    }

    mostrarModalPago(key, autorizado=false) {
        let porPagar = this.props.cambio > 0 ? 0 : Math.abs(this.props.cambio)
        if (key === 'efectivo') {
            this.setState({
                metodoPagoModal: {
                    titulo: 'Efectivo',
                    seleccionado: key
                }
            })
            
            return setTimeout(() => { 
                if (this.monto_efectivo_input) {
                    if(!this.state.efectivo.monto) {
                        this.monto_efectivo_input.value = porPagar
                    }

                    this.monto_efectivo_input.focus() 
                }
            }, 30)
        }

        if (key === 'cheque') {
            this.setState({
                metodoPagoModal: {
                    titulo: 'Cheque',
                    seleccionado: key
                }
            })
            return setTimeout(() => { 
                if (this.monto_cheque_input) {
                    this.monto_cheque_input.focus() 
                }
            }, 30)
        }

        if (key === 'tarjeta') {
            let cobros = this.props.tarjeta.cobros || []
            let integracionPinpad = false
            
            if (this.props.configuracion.habilitarPinpad) {
                integracionPinpad = ["santander", "banorte"].indexOf(this.state.integracionPinpad) > -1
            }

            if (integracionPinpad || cobros.length) {
                return this.mostrarModalPagosTarjeta()
            }

            this.setState({
                metodoPagoModal: {
                    titulo: 'Tarjeta',
                    seleccionado: key
                }
            })

            return setTimeout(() => { 
                if (this.monto_tarjeta_input) {
                    if(!this.props.tarjeta.monto) {
                        this.monto_tarjeta_input.value = porPagar
                    }

                    this.monto_tarjeta_input.focus() 
                }
            }, 30)

        }
        if (key === 'transferencia') {
            this.setState({
                metodoPagoModal: {
                    titulo: 'Transferencia',
                    seleccionado: key
                }
            })

            return setTimeout(() => { 
                if (this.monto_transferencia_input) {
                    if(!this.props.transferencia.monto) {
                        this.monto_transferencia_input.value = porPagar
                    }

                    this.monto_transferencia_input.focus() 
                }
            }, 30)
        }

        if (key === 'fondo') {
            if (!this.props.sesionCaja.cajero.autorizaciones || (!this.props.sesionCaja.cajero.autorizaciones.autorizacion_pagos_fondo_cliente && !autorizado)) {
                return this.setState({
                    modalAutorizacion: {
                        tipo_autorizacion: 'autorizacion_pagos_fondo_cliente'
                    }
                })
            }

            let fondo = {...this.state.fondo}
            fondo.monto = this.state.fondo.monto ? this.state.fondo.monto : porPagar

            return this.setState({
                fondo: fondo,
                metodoPagoModal: {
                    titulo: 'Fondo',
                    seleccionado: key
                }
            })

        }

        if (key === 'monedero') {
            this.setState({
                monedero: {
                    ...this.state.monedero,
                    monto: this.state.monedero.monto ? this.state.monedero.monto : porPagar
                },
                metodoPagoModal: {
                    titulo: 'Monedero',
                    seleccionado: key
                }
            })

            return setTimeout(() => { 
                if (this.monto_monedero_input) {
                    if(!this.state.efectivo.monto) {
                        this.monto_monedero_input.value = porPagar
                    }

                    this.monto_monedero_input.focus() 
                }
            }, 30)

        }

        return this.setState({
            metodoPagoModal: null
        })
    }

    mostrarModalPagosTarjeta() {
        this.setState({
            cobrosTarjeta: {
                ...this.state.cobrosTarjeta,
                visible: true
            }
        })
    }

    agregarPago() {
        if (this.state.metodoPagoModal) {
            const {habilitarPinpad, habilitarProsepago} = this.props.configuracion
            let porPagar = this.props.cambio > 0 ? 0 : Math.abs(this.props.cambio)
            let pago = {tipo: this.state.metodoPagoModal.seleccionado}
            let cf = this.props.configuracion.facturacion

            if (pago.tipo === 'fondo') {
                pago.monto = this.state.fondo.monto
            } else {
                pago.monto = +(this[`monto_${pago.tipo}_input`].value)
            }

            if (pago.monto > 999999) {
                return this.props.mensajeFlash('error', 'El monto a pagar parece ser incorrecto.')
            }

            if (pago.tipo === 'tarjeta' ) {
                
                /*if (pago.monto !== 0 && pago.monto !== this.props.tarjeta.monto && (porPagar === 0)) {
                    this[`monto_${pago.tipo}_input`].value = 0
                    return this.props.mensajeFlash('error', 'El restante a pagar es 0.')
                }*/

                pago.monto_comision = 0
                
                if ( (!habilitarPinpad && !habilitarProsepago) || this.props.otraTerminalProsepago) {
                    pago.tipo_tarjeta = this[`tipo_tarjeta_${pago.tipo}_input`].value;
                    pago.no_tarjeta = this[`no_tarjeta_${pago.tipo}_input`].value;
                        
                    if (pago.no_tarjeta === "") {
                        this[`no_tarjeta_${pago.tipo}_input`].select()
                        return this.props.mensajeFlash('error', 'Especifique el número de tarjeta.')
                    }

                    if (cf.cobrar_comision && pago.tipo_tarjeta === "credito") {
                        pago.comision = +(cf.comision_tarjeta)
                        pago.monto_comision = precisionDecimales(+cf.comision_tarjeta * pago.monto / 100)
                    }

                    if (cf.cobrar_comision_debito && pago.tipo_tarjeta === "debito") {
                        pago.comision = +(cf.comision_tarjeta_debito)
                        pago.monto_comision = precisionDecimales(+cf.comision_tarjeta_debito * pago.monto / 100)
                    }

                }

                pago.monto += pago.monto_comision
                
                if (pago.monto > (this.props.total + pago.monto_comision)) {
                    this[`monto_${pago.tipo}_input`].select()
                    return this.props.mensajeFlash('error', 'El monto no puede ser mayor al total.')
                }
            }

            if (pago.tipo === 'cheque' ) {
                if (pago.monto !== 0 && (porPagar === 0 || pago.monto > this.props[`montoCheque`])) {
                    return this.props.mensajeFlash('error', 'El restante a pagar es 0.')
                }

                if (pago.monto > this.props.total) {
                    this[`monto_${pago.tipo}_input`].select()
                    return this.props.mensajeFlash('error', 'El monto no puede ser mayor al total.')
                }

                pago.banco = this[`banco_${pago.tipo}_input`].value;
                pago.no_cuenta = this[`no_cuenta_${pago.tipo}_input`].value;
                pago.no_cheque = this[`no_cheque_${pago.tipo}_input`].value;
            }

            if (pago.tipo === 'transferencia' ) {
                if (pago.monto !== 0 && (porPagar === 0 || pago.monto > this.props[`montoTransferencia`])) {
                    return this.props.mensajeFlash('error', 'El restante a pagar es 0.')
                }

                if (pago.monto > this.props.total) {
                    this[`monto_${pago.tipo}_input`].select()
                    return this.props.mensajeFlash('error', 'El monto no puede ser mayor al total.')
                }

                pago.cta_bancaria = this[`cta_bancaria_${pago.tipo}_input`].value;
            }

            if (pago.tipo === 'fondo' ) {
                pago.aplicaciones = this.state.fondo.aplicaciones
                if (pago.monto !== 0 && (porPagar === 0 || pago.monto > this.props[`montoFondo`])) {
                    return this.props.mensajeFlash('error', 'El restante a pagar es 0.')
                }

                let totalFondo = this.getTotalFondoCliente();

                if (pago.monto > totalFondo) {
                    return this.props.mensajeFlash('error', 'El fondo del cliente no es suficiente.')
                }
                
                if (pago.monto > (porPagar + (this.props.fondo.monto || 0))) {
                    return this.props.mensajeFlash('error', `El monto del fondo no puede ser mayor a $${formatCurrency(porPagar)}.`)
                }
            }

            if (pago.tipo === 'monedero' ) {
                if (pago.monto !== 0 && (porPagar === 0 || pago.monto > this.props[`montoMonedero`])) {
                    return this.props.mensajeFlash('error', 'El restante a pagar es 0.')
                }

                let totalMonedero = this.getTotalMonederoCliente();

                if (pago.monto > totalMonedero) {
                    return this.props.mensajeFlash('error', 'El monto total del monedero es insuficiente.')
                }

                if (pago.monto > porPagar) {
                    return this.props.mensajeFlash('error', `El monto del monedero no puede ser mayor a $${formatCurrency(porPagar)}.`)
                }
            }
            
            this.props.seleccionarMetodoPago(pago)
            this.setState({metodoPagoModal: null})
            if (this.productoInput) {
                return this.productoInput.focus()
            }
        }
    }

    fondoCliente() {
        if (this.props.cliente && this.props.cliente.fondo) {
            return this.props.cliente.fondo.length > 0
        }
        return false
    }

    monederoCliente() {
        if (this.props.cliente && this.props.cliente.monedero) {
            return this.props.cliente.monedero.length > 0
        }
        return false
    }

    cancelarAutorizacion() {
        this.setState({
            modalAutorizacion: null
        })
    }

    getTotalFondoCliente() {
        let totalFondo = 0;
        this.props.cliente.fondo.map((f) => {
            return totalFondo += precisionDecimales(f.saldo)
        })
        return totalFondo;
    }

    getTotalMonederoCliente() {
        let totalMonedero = 0;
        this.props.cliente.monedero.map((f) => {
            return totalMonedero += precisionDecimales(f.saldo)
        })
        return totalMonedero;
    }

    setClaveAutorizacion() {
        let clave = this.clave_autorizacion_input.value.trim()
        let {
            tipo_autorizacion, 
            producto, 
            productoIndex, 
            cancelarVenta
        } = this.state.modalAutorizacion
        let data = {clave: clave, autorizacion: tipo_autorizacion}
        return Api.validarAutorizacion(this.props.api_key, data)
        .then((response) => {
            if (response.autorizado) {
                if (!cancelarVenta && tipo_autorizacion === 'autorizacion_cancelar_producto') {
                    this.eliminarProducto(producto, true, productoIndex)
                } else if (tipo_autorizacion === 'autorizacion_cancelar_producto') {
                    this.resetVenta()
                } else if (tipo_autorizacion === 'autorizacion_pagos_fondo_cliente') {
                    this.setState({fondo:{...this.state.fondo, responsable: response.responsable}})
                    this.mostrarModalPago('fondo', true)
                } else if (tipo_autorizacion === 'autorizacion_vender_debajo_mu') {
                    producto = this.getProductoInline(this.state.modalAutorizacion.cantidad, this.state.modalAutorizacion.producto)
                    producto.producto.debajoMargen = true
                    this.props.seleccionarProducto(producto)
                }

                this.setState({
                    modalAutorizacion: null
                })
            } else {
                this.props.mensajeFlash('error', "La clave de autorización es incorrecta.")
                this.clave_autorizacion_input.select()
            }
        })
    }

    eliminarProducto(producto, autorizado=false, index) {
        let autorizaciones = this.props.usuario.autorizaciones
        
        if (this.props.tarjeta.cobros && this.props.tarjeta.cobros.length) {
            return this.props.mostrarAlerta({
                mensaje: 'No se pueden modificar los productos cuando un cobro de tarjeta ya ha sido realizado.'
            })
        }

        if ((autorizaciones && autorizaciones.autorizacion_cancelar_producto) || autorizado) {
            return this.props.eliminarProducto(producto, index)
        }
        
        this.setState({
            modalAutorizacion: {
                producto: producto,
                productoIndex: index,
                mensajeInfo: `Ingrese clave de autorización para eliminar el producto <b>${producto.producto.codigo}</b>.`,
                tipo_autorizacion: 'autorizacion_cancelar_producto'
            }
        })
    }

    getDatosVenta() {
        let data = {}
        const state = this.props
        const infoValida = [
            'sesionCaja', 'cliente', 'productos', 'uso_cfdi', 'direccionEntrega', 'otraTerminalProsepago',
            'efectivo', 'transferencia', 'tarjeta', 'cheque', 'fondo', 'extra_fields', 'monedero',
            'total', 'totalDescuento', 'totalArticulos', 'cambio', 'pinpadSeleccionado',
            'entregaDomicilio', 'requiereFactura', 'solicitiarRecarga', 'pagoServicioLdi', 'cobrosPinpad', 'fechaEntregaDomicilio'
        ]

        for(let k in state) {
            if (infoValida.indexOf(k) > -1) {
                data[k] = state[k]
            }
        }

        if (state._id) {
            data._id = state._id
        }

        if (state.numero_serie) {
            data.numero_serie = state.numero_serie
        }

        if (state.folio) {
            data.folio = state.folio
        }

        /* retornamos solamente lo que queremos guardar de la venta. */ 
        data.cliente = getClienteObj(data.cliente)
        data.sesionCaja = getSesionCajaObj(data.sesionCaja)

        data.productos.forEach(prod => {
            let p = {...prod}
            delete p.descuentoAutorizado
            delete p.descuentoAutorizadoImporte
            delete p.deshabilitarCantidad
            delete p.promociones
            delete p.activo

            p.producto = getProductoObj(p.producto)
        })
        
        return data
    }

    validarCobro() {
        return precisionDecimales(this.props.aCobrar) >= precisionDecimales(this.props.total)
    }

    resetVenta() {
        this.props.nuevaVenta()
        
        this.setState({
            efectivo: {},
            tarjeta: {},
            fondo: {},
            monedero: {},
            cheque: {},
            transferencia: {},
            existenciasAlmacen: null,
            guardar: {
                habilitado: true, 
                texto: 'Guardar e imprimir'
            }
        })

        this.seleccionarClienteDefault()
        
        if (this.productoInput) {
            this.productoInput.focus()
        }
    }

    guardar(credito=false) {
        if (this.props.guardando) {
            return false
        }
        
        if (! this.props.productos.length ) {
            this.props.mensajeFlash('error', "Ingrese productos para continuar.")
            return false
        }

        for (var i = this.props.productos.length - 1; i >= 0; i--) {
            var p = this.props.productos[i]
            if (!p.cantidad) {
                return this.props.mostrarAlerta({mensaje: `El producto <b>${p.producto.codigo}</b> tiene cantidad 0.`})
            }
        }

        if (!credito && !this.validarCobro()) {
            this.props.mensajeFlash('error', "La cantidad a cobrar es incorrecta.")
            return false
        }

        let venta = this.getDatosVenta()
        
        const {habilitarProsepago, habilitarPinpad} = this.props.configuracion
        venta.credito = credito

        if (venta.credito) {
            venta.requiereFactura = true
            venta.efectivo = {}
            venta.tarjeta = {}
            venta.fondo = {}
            venta.monedero = {}
            venta.cheque = {}
            venta.transferencia = {}
        }

        if (venta.cliente && !venta.cliente.id) {
            this.props.mensajeFlash('error', "Seleccione un cliente.")
            return false
        }

        // si esta habilitado prosepago y tambien el pinpad de otro banco
        // se debe seleccionar que pinpad se usará
        if (venta.tarjeta.monto) {
            if ((habilitarProsepago && habilitarPinpad) && !venta.pinpadSeleccionado) {
                this.props.mensajeFlash('error', "Seleccione el pinpad que se usará para realizar el cobro a la tarjeta.")
                return false
            }
        }

                
        // this.setState({guardar: {habilitado: false, texto: 'Guardando...'}})
        this.props.guardarVenta(this.props.api_key, venta)
        this.setState({
            ...this.state,
            fondo: {}
        })

        if (this.props.ventaIndex) {
            this.props.eliminarVentaEspera(this.props.ventaIndex)
        }

    }

    async cancelarOperacionTarjeta() {
        await Api.cancelarOperacionTarjeta(this.props.api_key)
        this.setState({
            cobrosTarjeta: {
                ...this.state.cobrosTarjeta,
                infoTarjeta: null
            }
        })
    }
    
    async obtenerInfoTarjeta(cobro) {
        if (!cobro.monto) {
            return this.props.mostrarAlerta({mensaje: 'El monto a cobrar no puede ser 0.'})
        }

        let infoTarjeta = await Api.obtenerInfoTarjeta(this.props.api_key, {monto: cobro.monto})

        if (infoTarjeta.status === 'success') {
            return this.setState({
                cobrosTarjeta: {
                    ...this.state.cobrosTarjeta,
                    infoTarjeta: infoTarjeta
                }
            })
        }

        let mensaje = 'Hubo un error al obtener información de la tarjeta'

        if (infoTarjeta.message) {
            mensaje = infoTarjeta.message
        }

        if (infoTarjeta.mensaje) {
            mensaje = infoTarjeta.mensaje
        }
        
        this.props.mostrarAlerta({
            titulo: 'Problemas al leer información de la tarjeta',
            mensaje: mensaje
        })
    }

    async cobrarTarjeta(cobro) {
        let ventaObj = Object.assign({}, {...this.getDatosVenta()})
        let cobrosTarjeta = {...this.state.cobrosTarjeta}
        let montoTarjetaOrig = ventaObj.tarjeta.monto
        let imprimir = true

        try {
            if (!cobro.monto) {
                return this.props.mostrarAlerta({mensaje: 'El monto a cobrar no puede ser 0.'})
            }
            
            this.props.cargando()

            // no se que pasa pero al hacer esto
            // this.props.tarjeta.monto = cobro.monto
            // por eso lo guardo en montoTarjetaOrig y en caso de error
            // lo regreso al original
            ventaObj.tarjeta.monto = cobro.monto
            
            let statusCobro = await Api.cobrarVentaTarjeta(this.props.api_key, ventaObj)
            if (statusCobro.venta) {
                this.props.setProp({folio: statusCobro.venta.folio, numero_serie: statusCobro.venta.numero_serie})
            }

            if (statusCobro.status === 'success') {
                let pagoTarjeta = this.props.tarjeta

                
                this.props.changeTipoPago('tarjeta', {
                    ...pagoTarjeta,
                    monto: statusCobro.venta.tarjeta.monto,
                    cobros: statusCobro.venta.tarjeta.cobros
                })


                cobrosTarjeta.infoTarjeta = null

                this.props.mostrarAlerta({
                    mensaje: 'El cargo se realizó correctamente.',
                    handleAceptar: async () => {
                        if (imprimir) {
                            Impresora.imprimirVoucher(statusCobro.venta._id, this.props.api_key, {tipo: 'comercio', cobroId: statusCobro.cobroId})
                            Impresora.imprimirVoucher(statusCobro.venta._id, this.props.api_key, {tipo: 'cliente', cobroId: statusCobro.cobroId})
                        }
                        
                        if (this.validarCobro()) {
                            await this.guardar()
                            cobrosTarjeta.visible = false
                        }
                    }
                })
            }

            this.setState({
                cobrosTarjeta: cobrosTarjeta
            })

            this.props.cargando(false)
        } catch(e) {
            this.props.cargando(false)
            
            ventaObj.tarjeta.monto = montoTarjetaOrig

            this.setState({
                cobrosTarjeta: {
                    ...this.state.cobrosTarjeta,
                    infoTarjeta: null
                }
            })
            
            if (imprimir) {
                if (e.transaccion && this.state.integracionPinpad === 'banorte') {
                    Impresora.imprimirVoucherTransaccion(e.transaccion._id, this.props.api_key, 'cliente')
                }
            }

            if (e.cobroPinpad) {
                this.props.mostrarAlerta({ 
                    titulo: 'No se realizó ningún cargo a su tarjeta',
                    mensaje: e.cobroPinpad.mensaje
                })
            } else {
                // prosepago
                if (e.message) {
                    this.props.mostrarAlerta({ 
                        titulo: 'Ocurrió un problema al intentar realizar el cargo',
                        mensaje: e.message
                    })
                }

            }

        }
    }

    setDescuentoProducto(porcentaje, inline, index) {
        if (this.props.tarjeta.cobros && this.props.tarjeta.cobros.length) {
            return this.props.mostrarAlerta({
                mensaje: 'No se pueden modificar los productos cuando un cobro de tarjeta ya ha sido realizado.'
            })
        }

        let {configuracion} = this.props
        let porcentajeValido = false
        let porcentajeMax = 0

        configuracion.facturacion.descuentos_autorizados_venta.map(d => {

            if (d.linea_id === inline.producto.linea_id && 
                d.sublinea_id === inline.producto.sublinea_id && 
                d.subsublinea_id === inline.producto.subsublinea_id ) {
                if (+d.porcentaje >= porcentaje) {
                    porcentajeValido = true
                } else {
                    porcentajeMax = +d.porcentaje
                }
            } else {
                if (d.descuento_general) {
                    if (+d.porcentaje >= porcentaje) {
                        porcentajeValido = true
                    } else {
                        porcentajeMax = +d.porcentaje
                    }
                }
            }

            return null
        })

        if (! porcentajeValido ) {
            this.props.mostrarAlerta({
                mensaje: `El descuento máximo para el producto es de ${porcentajeMax}%`
            })
            inline.descuentoAutorizado = porcentajeMax
            return this.props.actualizarProductoInline(inline, index)
        }
        
        inline.descuentoAutorizado = porcentaje
        this.props.actualizarProductoInline(inline, index)
    }

    setCantidadProducto(cantidad, inline, index) {
        if (this.props.tarjeta.cobros && this.props.tarjeta.cobros.length) {
            return this.props.mostrarAlerta({
                mensaje: 'No se pueden modificar los productos cuando un cobro de tarjeta ya ha sido realizado.'
            })
        }

        if (inline.producto.existenciaAt) {
            let totalCantidad = 0
            totalCantidad += cantidad

            this.props.productos.forEach((p, i) => {
                if (p.producto.id === inline.producto.id && i !== index) {
                    totalCantidad += p.cantidad
                }
            })

            if (totalCantidad > inline.producto.existenciaAt) {
                this.props.mostrarAlerta({
                    mensaje: `La cantidad del producto <b>${inline.producto.descripcion}</b> no puede ser mayor a ${inline.producto.existenciaAt}.`
                })
                
                return false
            }
        }

        if (inline.producto.restringir_decimales && !Number.isInteger(cantidad)) {
            this.props.mostrarAlerta({
                mensaje: `La cantidad del producto <b>${inline.producto.descripcion}</b> no puede contener decimales.`
            })

            return false
        }

        // let producto  = this.getProductoInline(cantidad, inline.producto)
        inline.cantidad = cantidad
        this.props.actualizarProductoInline(inline, index)
    }


    handleProductoBlur(e)  {
        if (e.target.value !== "") {
            // this.onSelectProducto(e.target.value)
        }
        this.props.setProductosAc([])
    }

    handleClienteBlur(e)  {
        this.props.setClientesAc([])
    }

    handleProductoKeyup(e) {
        let charCode = (typeof e.which === "number") ? e.which : e.keyCode
        if (charCode === 13) {
            if (e.target.value !== "") {
                this.onSelectProducto(e.target.value)
            }
        }
    }

    handleClienteKeyup(e) {
        let charCode = (typeof e.which === "number") ? e.which : e.keyCode
        if (charCode === 13) {
            if (e.target.value !== "") {
                this.onSelectCliente(e.target.value)
            }
        }
    }

    handleKeyPress(e) {
        if (e.key === 'Enter') {
            this.agregarPago()
        }
    }

    handleChangeExtraField(extra, e) {
        this.props.infoExtraChange(extra, e.target.value)
    }

    setServicioLdi(producto) {
        let referencia = (this.referencia_servicio_ldi_input.value || '').trim()
        let monto = Number(this.monto_servicio_ldi_input.input.value)

        if (referencia === "") {
            this.referencia_servicio_ldi_input.focus()
            return this.props.mensajeFlash('error', 'Especifique la referencia.')
        }

        if (monto <= 0) {
            this.monto_servicio_ldi_input.focus()
            return this.props.mensajeFlash('error', 'El monto es incorrecto.')
        }

        producto.producto.servicio_ldi_monto = monto
        producto.producto.servicio_ldi_referencia = referencia
        producto.deshabilitarCantidad = true

        if (producto.producto.complementario) {
            this.props.seleccionarProducto({
                ...this.getProductoInline(1, producto.producto.complementario),
                deshabilitarBorrado: true,
                deshabilitarCantidad: true,
            })
        }

        this.props.seleccionarProducto(producto)

        this.setState({
            modalServicioLdi: null
        })
    }

    setNumeroRecarga(producto) {
        if (this.no_telefono_input.value !== this.no_telefono_confirm_input.value) {
            this.no_telefono_confirm_input.focus()
            return this.props.mensajeFlash('error', 'La confirmación del número de teléfono es incorrecta.')
        }

        if (this.no_telefono_input.value.length < 10) {
            this.no_telefono_confirm_input.focus()
            return this.props.mensajeFlash('error', "El número de teléfono debe contener 10 dígitos")
        }

        producto.numeroTelefonico = this.no_telefono_input.value
        this.no_telefono_input.value = ""
        this.no_telefono_confirm_input.value = ""
            
        this.props.seleccionarProducto(producto)
        this.setState({
            modalRecarga: null
        })
    }

    seleccionarUm(productoInline, index) {
        if (this.props.tarjeta.cobros && this.props.tarjeta.cobros.length) {
            return this.props.mostrarAlerta({
                mensaje: 'No se pueden modificar los productos cuando un cobro de tarjeta ya ha sido realizado.'
            })
        }

        this.setState({
            modalUmProducto: {
                producto: productoInline,
                index: index
            }
        })
    }

    setUmProducto() {
        if (!this.state.modalUmProducto) {
            return 
        }

        let producto = this.state.modalUmProducto.producto;
        let um = producto.producto.ums.find((el) => {
            return +el.id === +this.um_producto_input.value
        })

        if (um && um.id !== producto.producto.um.id) {
            this.props.setUmProducto(um, this.state.modalUmProducto.index)
        }

        this.setState({
            modalUmProducto: null
        })
    }

    handleVentaEspera() {
        this.props.setVentaEspera(this.props)
        this.resetVenta()
    }

    seleccionarVentaEspera(ventaIndex) {
        if (this.props.total !== 0) {
            return this.props.mostrarAlerta({mensaje: 'Concluya o guarde la venta actual para continuar.'})
        }
        this.props.cargarVentaEspera(ventaIndex)

        if (this.productoInput) {
            this.productoInput.focus()
        }
    }

    editarProducto() {
        if (this.props.tarjeta.cobros && this.props.tarjeta.cobros.length) {
            return this.props.mostrarAlerta({
                mensaje: 'No se pueden modificar los productos cuando un cobro de tarjeta ya ha sido realizado.'
            })
        }

        let {tipo_autorizacion, producto, productoIndex, cantidad} = this.state.modalEditarProducto
        let autorizado = this.props.usuario.autorizaciones[tipo_autorizacion]
        if (autorizado) {
            this.setCantidadProducto(cantidad, producto, productoIndex)
            return this.setState({modalEditarProducto: null})
        }

        let clave = this.clave_autorizacion_input.value.trim()
        let data = {clave: clave, autorizacion: tipo_autorizacion}

        if (!clave) {
            return this.clave_autorizacion_input.select()
        }

        return Api.validarAutorizacion(this.props.api_key, data)
        .then((response) => {
            if (response.autorizado) {
                this.setCantidadProducto(cantidad, producto, productoIndex)
                this.setState({modalEditarProducto: null})
            } else {
                this.props.mensajeFlash('error', "La clave de autorización es incorrecta.")
                this.clave_autorizacion_input.select()
            }
        })
    }

    toggleEditarProducto(producto, productoIndex) {
        this.setState({
            modalEditarProducto: {
                tipo_autorizacion: 'modificar_cantidad_nota',
                producto: producto,
                productoIndex: productoIndex,
                cantidad: producto.cantidad
            }
        })
    }

    changeProductoEdicion(campo, valor) {
        if (!this.state.modalEditarProducto) {
            return false
        }

        this.setState({
            modalEditarProducto: {
                ...this.state.modalEditarProducto, 
                [campo]: valor
            }
        })
    }

    handleCancelarVenta() {
        let autorizaciones = this.props.usuario.autorizaciones

        if (this.props.tarjeta.cobros && this.props.tarjeta.cobros.length) {
            return this.props.mostrarAlerta({
                titulo: 'Error al cancelar venta.',
                mensaje: `La venta no puede ser cancelada por que tiene ${this.props.tarjeta.cobros.length} cobros de tarjeta asignados.`
            })
        }

        if (autorizaciones && autorizaciones.autorizacion_cancelar_producto) {
            return this.resetVenta()
        }

        this.setState({
            modalAutorizacion: {
                cancelarVenta: true,
                mensajeInfo: 'Ingrese clave de autorización para cancelar la venta.',
                tipo_autorizacion: 'autorizacion_cancelar_producto'
            }
        })
        
    }

    render() {
        const {cliente, pinpadSeleccionado} = this.props
        const {facturacion, habilitarProsepago, habilitarPinpad, pinpad, numero_serie} = this.props.configuracion

        let modalEditarProducto = this.state.modalEditarProducto
        let modalAutorizacion = this.state.modalAutorizacion
        let modalPromocionesProducto = this.state.modalPromocionesProducto
        let modalUmProducto = this.state.modalUmProducto
        let modalRecarga = this.state.modalRecarga
        let modalServicioLdi  = this.state.modalServicioLdi 
        let cobrarMultipleTarjeta = this.state.cobrosTarjeta.visible
        let modalPago = false
        let pagarEfectivo = false
        let pagarCheque = false
        let pagarTarjeta = false
        let pagarTransferencia = false
        let pagarFondo = false
        let pagarMonedero = false
        let pinpadModoPruebas = false

        // montos
        let montoEfectivo = this.props.efectivo.monto > 0 ? this.props.efectivo.monto : null;
        let montoCheque = this.props.cheque.monto > 0 ? this.props.cheque.monto : null;
        let montoTarjeta = this.props.tarjeta.monto > 0 ? this.props.tarjeta.monto : null;
        let comisionTarjeta = this.props.tarjeta.comision > 0 ? this.props.tarjeta.comision : null;
        let montoTransferencia = this.props.transferencia.monto > 0 ? this.props.transferencia.monto : null;
        let montoFondo = this.props.fondo.monto > 0 ? this.props.fondo.monto : null;
        let montoMonedero = this.props.monedero.monto > 0 ? this.props.monedero.monto : null;
        let fondoCliente = facturacion.metodo_pago_fondo && this.fondoCliente();
        let monederoCliente = this.monederoCliente();
        let productos = this.props.productos; //this.props.productos.slice().reverse()
        let habilitarDescuentosAutorizados = Boolean((facturacion.descuentos_autorizados_venta || []).length)
        let porPagar = this.props.cambio > 0 ? 0 : Math.abs(this.props.cambio)
        let modalFechaEntrega = this.state.modalFechaEntrega.visible

        if (habilitarPinpad) {
            pinpadModoPruebas = pinpad.modoPruebas
        }

        if (this.state.metodoPagoModal) {
            modalPago = true
            if (this.state.metodoPagoModal.seleccionado === 'efectivo') {
                pagarEfectivo = true
            }

            if (this.state.metodoPagoModal.seleccionado === 'cheque') {
                pagarCheque = true
            }

            if (this.state.metodoPagoModal.seleccionado === 'tarjeta') {
                pagarTarjeta = true
            }

            if (this.state.metodoPagoModal.seleccionado === 'transferencia') {
                pagarTransferencia = true
            }

            if (this.state.metodoPagoModal.seleccionado === 'fondo') {
                pagarFondo = true
            }

            if (this.state.metodoPagoModal.seleccionado === 'monedero') {
                pagarMonedero = true
            }
        }

        return (
            <Shortcuts
                name='PUNTO_VENTA'
                handler={this._handleShortcuts.bind(this)}
                eventType='keyup'
                isolate={true}
            >
                <div className="container-fluid full-height-content" ref={c => {this.component = c}}>
                    <TituloComponent texto={`Punto de Venta | ${numero_serie}-${this.props.siguienteFolio}`}></TituloComponent>
                    <div className="form">
                        <div className="row">
                            <div className="col-md-6">
                                { Boolean(productos.length) &&
                                    <button className="btn btn-link text-muted font-weight-bold" onClick={this.handleVentaEspera.bind(this)}>
                                        Venta en Espera
                                    </button>
                                }
                                { this.props.ventasEspera.length ?
                                     this.props.ventasEspera.map((v, i) => {
                                        return <button className="btn btn-light font-weight-bold mr-1 mb-1" 
                                                onClick={this.seleccionarVentaEspera.bind(this, i)}
                                                title={"En espera desde " + v.inicioEspera.fromNow() }>
                                             <i className="ion-clock"></i> ${formatCurrency(v.total)}
                                        </button>
                                    })
                                    :
                                    ''
                                }
                            </div>
                            <div className="col-md-6 text-right mb-2">
                                <Link to="/verificador-precios" className="btn btn-link text-info font-weight-bold">
                                    Verificador de Precios
                                </Link>
                                <Link to="/retiro-efectivo" className="btn btn-link text-info font-weight-bold">
                                    Retirar Efectivo
                                </Link>
                                { (productos.length > 0) &&
                                <button className="btn btn-link text-danger font-weight-bold" onClick={this.handleCancelarVenta.bind(this)}>
                                    Cancelar Venta
                                </button>
                                }
                            </div>

                            <div className="col-md-8 col-lg-7">
                                <fieldset>
                                    <div className="row mb-1">
                                        <div className="col-12">
                                            <ul className="list-inline mb-0">
                                                <li className="d-inline-block mr-3">
                                                    <div className="form-group">
                                                        <label className="control control-checkbox">
                                                            Requiere factura
                                                            <input 
                                                                type="checkbox"
                                                                checked={this.props.requiereFactura}
                                                                onChange={(ev) => {
                                                                    this.props.requerirFactura()
                                                                }}
                                                            />
                                                            <div className="control_indicator"></div>
                                                        </label>
                                                    </div>
                                                </li>
                                                <li className="d-inline-block mr-3">
                                                    <div className="form-group">
                                                        <label className="control control-checkbox">
                                                            Entregar a domicilio
                                                            <input 
                                                                type="checkbox"
                                                                checked={this.props.entregaDomicilio}
                                                                onChange={(ev) => {
                                                                    if (this.props.entregaDomicilio) {
                                                                        this.props.entregarDomicilio()
                                                                    } else {
                                                                        this.setState({
                                                                            modalFechaEntrega: {
                                                                                ...this.state.modalFechaEntrega,
                                                                                visible: true
                                                                            }
                                                                        })
                                                                    }
                                                                    // this.props.entregarDomicilio()
                                                                }}
                                                            />
                                                            <div className="control_indicator"></div>
                                                        </label>
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="col-7">
                                            <div className="form-group">
                                                <label htmlFor="">Cliente:</label>
                                                <Autocomplete
                                                    wrapperStyle={{display:'block'}}
                                                    items={this.props.ac_clientes || []}
                                                    ref={(inp) => this.clienteInput = inp }
                                                    inputProps={{
                                                        className:'form-control ac', 
                                                        onKeyUp:this.handleClienteKeyup.bind(this),
                                                        onBlur:this.handleClienteBlur.bind(this),
                                                    }}
                                                    renderItem={ClienteAutocompleteView}
                                                    renderMenu={MenuAutocompleteView}
                                                    getItemValue={(item) => {return item.razon_social}}
                                                    onChange={this.onChangeCliente.bind(this)}
                                                    value={this.props.ac_cliente}
                                                    onSelect={this.onSelectCliente.bind(this)}
                                                />
                                            </div>
                                            <small className="text-info">
                                                RFC: <span className="rfc font-weight-bold">{cliente.rfc}</span>
                                            </small>

                                            { Boolean(cliente.direccion && cliente.direccion.email && cliente.direccion.email !== "") && 
                                            <small className="text-info ml-1 ">
                                                <span className="font-weight-bold">{cliente.direccion.email}</span>
                                            </small>
                                            }
                                            
                                            { Boolean(cliente.direccion && cliente.direccion.direccion_completa && cliente.direccion.direccion_completa !== ".") &&
                                            <small className="d-block text-muted" title="Dirección">
                                                {cliente.direccion.direccion_completa}
                                            </small>
                                            }

                                            {(this.props.requiereFactura && cliente.credito && cliente.credito.habilitado) &&
                                                <small className="text-success ml-3">
                                                        Crédito Disponible: <span className="font-weight-bold">
                                                        ${formatCurrency(cliente.credito.credito_disponible)}
                                                    </span>
                                                </small>
                                            }
                                        </div>
                                        <div className="col">
                                            <div className="form-group">
                                                <label htmlFor="">Dirección Entrega:</label>
                                                {this.renderDirecciones(cliente.direcciones_entrega)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-12">
                                            <div className="form-group">
                                                <label htmlFor="">Uso CFDI:</label>
                                                <select 
                                                    onChange={(e) => { this.props.seleccionarUsoCFDI(e.target.value) }} 
                                                    className="form-control" 
                                                    defaultValue={this.props.uso_cfdi}>
                                                    { this.props.configuracion.facturacion.uso_cfdi.map((elem) => {
                                                        return <option value={elem.id} key={`usocfdi-${elem.id}`}>{elem.value}</option>
                                                      })
                                                    }                       
                                                </select>
                                            </div>

                                            { (this.props.configuracion.mostrarCamposAdicionales && facturacion.extra_fields.length > 0) && 
                                                <div className="row align-items-center">
                                                { facturacion.extra_fields.map((extra) => {
                                                    return (
                                                        <div className="col-md-3" key={`extrafield-${extra.nombre}`}>
                                                            <div className="form-group">
                                                                <label htmlFor="">{extra.valor}:</label>
                                                                <input 
                                                                    onChange={this.handleChangeExtraField.bind(this, extra)}
                                                                    value={this.props.extra_fields[extra.nombre]}
                                                                    type="text" 
                                                                    className="form-control" 
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                </div>
                                            }
                                        </div>

                                        <div className="col">
                                            <div className="form-group">
                                                <label htmlFor="">Cantidad:</label>
                                                <InputNumber
                                                  style={{ width: '100%' }}
                                                  value={this.state.cantidad} 
                                                  onChange={(value) => {
                                                        if (+value < 0) {
                                                            value = 1
                                                        }
                                                        this.setState({cantidad: value})
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="col-9">
                                            <div className="form-group">
                                                <label htmlFor="">Producto:</label>
                                                <Autocomplete
                                                    autoFocus
                                                    wrapperStyle={{display:'block'}}
                                                    items={this.props.ac_productos || []}
                                                    ref={(input) => {this.productoInput = input}}
                                                    inputProps={{
                                                        className:'form-control ac', 
                                                        onKeyUp:this.handleProductoKeyup.bind(this),
                                                        onBlur:this.handleProductoBlur.bind(this),
                                                    }}
                                                    renderItem={ProductoAutocompleteView}
                                                    renderMenu={MenuAutocompleteView}
                                                    getItemValue={(item) => {return item.descripcion}}
                                                    onChange={this.onChangeProducto.bind(this)}
                                                    value={this.state.ac_producto}
                                                    onSelect={this.onSelectProducto.bind(this)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>

                                { (productos.length > 0) && 
                                    <InlineProductoComponent 
                                        productos={productos} 
                                        onChangeCantidad={this.setCantidadProducto.bind(this)}
                                        habilitarDescuentosAutorizados={habilitarDescuentosAutorizados}
                                        onChangeDescuento={this.setDescuentoProducto.bind(this)}
                                        onSeleccionarUm={this.seleccionarUm.bind(this)}
                                        onTogglePromocion={this.togglePromocionProducto.bind(this)}
                                        onEliminarProducto={this.eliminarProducto.bind(this)}
                                        onToggleEditar={this.toggleEditarProducto.bind(this)}
                                    >
                                    </InlineProductoComponent>
                                }
                            </div>

                            <div className="col-md-4 col-lg-5">
                                <fieldset>
                                    <TotalesComponent
                                        totalArticulos={this.props.totalArticulos}
                                        totalDescuento={this.props.totalDescuento}
                                        total={this.props.total}
                                        aCobrar={this.props.aCobrar}
                                        cambio={this.props.cambio}
                                    >   
                                    </TotalesComponent>
                                </fieldset>

                                { (productos.length > 0) &&
                                    <div>
                                        <div className="metodosPago">
                                            <h5 className="m-2 text-center text-primary">Método de Pago</h5>

                                            <div className="row">
                                                { facturacion.metodo_pago_efectivo &&
                                                <div className="col">
                                                    <button 
                                                        onClick={(ev) => {this.mostrarModalPago('efectivo')}} 
                                                        type="button" 
                                                        className={`btn btn-${montoEfectivo ? 'success' : 'secondary'} btn-block`}>
                                                        Efectivo {montoEfectivo && <span>${formatCurrency(montoEfectivo)}</span>}
                                                    </button>
                                                </div>
                                                }
                                                { facturacion.metodo_pago_cheque &&
                                                <div className="col">
                                                    <button 
                                                        onClick={(ev) => {this.mostrarModalPago('cheque')}} 
                                                        type="button" 
                                                        className={`btn btn-${montoCheque ? 'success' : 'secondary'} btn-block`}>
                                                        Cheque {montoCheque && <span>${formatCurrency(montoCheque)}</span>}
                                                    </button>
                                                </div>
                                                }
                                            </div>
                                            <div className="row">
                                                { facturacion.metodo_pago_tarjeta && 
                                                <div className="col">
                                                    <button 
                                                        onClick={(ev) => {this.mostrarModalPago('tarjeta')}} 
                                                        type="button" 
                                                        className={`btn btn-${montoTarjeta ? 'success' : 'secondary'} btn-block`}>
                                                        Tarjeta {montoTarjeta && <span>${formatCurrency(montoTarjeta)}</span>} 
                                                        { comisionTarjeta && 
                                                            <div style={{lineHeight: 1, fontSize: '.8em'}}>
                                                                <b>({comisionTarjeta}% de comisión)</b>
                                                            </div> 
                                                        }
                                                    </button>
                                                </div>
                                                }
                                                { facturacion.metodo_pago_transferencia &&
                                                <div className="col">
                                                    <button 
                                                        onClick={(ev) => {this.mostrarModalPago('transferencia')}} 
                                                        type="button" 
                                                        className={`btn btn-${montoTransferencia ? 'success' : 'secondary'} btn-block`}>
                                                        Transferencia {montoTransferencia && <span>${formatCurrency(montoTransferencia)}</span>}
                                                    </button>
                                                </div>
                                                }
                                            </div>
                                            { fondoCliente &&
                                            <div className="row">
                                                <div className="col">
                                                    <button 
                                                        onClick={(ev) => {this.mostrarModalPago('fondo')}} 
                                                        type="button" 
                                                        className={`btn btn-${montoFondo ? 'success' : 'secondary'} btn-block`}>
                                                        Fondo {montoFondo && <span>${formatCurrency(montoFondo)}</span>}
                                                    </button>
                                                </div>
                                            </div>
                                            }

                                            { monederoCliente &&
                                            <div className="row">
                                                <div className="col">
                                                    <button 
                                                        onClick={(ev) => {this.mostrarModalPago('monedero')}} 
                                                        type="button" 
                                                        className={`btn btn-${montoMonedero ? 'success' : 'secondary'} btn-block`}>
                                                        Monedero ${formatCurrency(this.getTotalMonederoCliente() - montoMonedero)} {montoMonedero && <span>- Aplicado: ${formatCurrency(montoMonedero)}</span>}
                                                    </button>
                                                </div>
                                            </div>
                                            }

                                            { ( this.props.requiereFactura && (cliente.credito && cliente.credito.habilitado 
                                                && cliente.credito.credito_disponible >= this.props.total)) &&
                                            <div className="row">
                                                <div className="col">
                                                    <button 
                                                        onClick={(e) => {this.guardar(true)}} 
                                                        type="button" 
                                                        className={`btn btn-${this.validarCobro() ? 'secondary' : 'primary'} btn-block`}>
                                                        Crédito
                                                    </button>
                                                </div>
                                            </div>
                                            }
                                        </div>
                                        { ( this.validarCobro() ) &&
                                            <button  
                                            disabled={this.props.guardando}
                                            className="btn btn-primary btn-block" 
                                            type="submit" 
                                            onClick={(e) => {this.guardar()}}
                                            >
                                                <i className="ion-printer"></i> {this.state.guardar.texto}
                                            </button>
                                        }
                                    </div>
                                }

                                { this.state.existenciasAlmacen &&
                                <Draggable>
                                    <div className="existenciasPorAlmacen">
                                        <div className="text-right">
                                            <button onClick={e => { this.setState({existenciasAlmacen: null})}} className="btn btn-link btn-xs" title="Ocultar información">
                                                <i className="ion-close"></i>
                                            </button>
                                        </div>
                                        <h5 className="text-info text-center">
                                            {this.state.existenciasAlmacen.producto.codigo} <br/>
                                            <small className="text-muted">{this.state.existenciasAlmacen.producto.descripcion}</small>
                                        </h5>
                                        <table className="table table-sm table-list table-striped">
                                            <thead>
                                                <tr>
                                                    <th>{this.props.configuracion.inventario.palabra_almacen}</th>
                                                    <th>Existencia</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {this.state.existenciasAlmacen.existencias.map(e => {
                                                    return (
                                                    <tr key={`ex-${e.almacen.id}`}>
                                                        <td>{e.almacen.nombre}</td>
                                                        <td>
                                                            <b className={(+e.existencia > 0) ? 'text-success': 'text-danger'}>
                                                                {+e.existencia}
                                                            </b>
                                                        </td>
                                                    </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Draggable>
                                }
                            </div>
                        </div>

                        { (modalPago && !cobrarMultipleTarjeta) && 
                        <div className="dialog-box metodoPagoBox">
                            <h4 className="text-center">{this.state.metodoPagoModal.titulo}</h4>

                            <div className="scrollable">
                                { pagarEfectivo &&
                                <div className="form-group">
                                    <label htmlFor="">Monto:</label>
                                    <input 
                                        type="text" 
                                        ref={(input) => {this.monto_efectivo_input = input}}
                                        onKeyPress={this.handleKeyPress.bind(this)}
                                        className="form-control text-right" 
                                        onFocus={this.selectOnFocus.bind(this)}
                                        defaultValue={this.props.efectivo.monto || 0}
                                        onChange={(e) => {
                                            // this.props.changeTipoPago('efectivo', {...this.props.efectivo, monto: e.target.value})
                                        }}
                                    />
                                </div>
                                }

                                { pagarCheque &&
                                <div>
                                    <div className="form-group">
                                        <label htmlFor="">Monto:</label>
                                        <input 
                                            type="text" 
                                            ref={(input) => {this.monto_cheque_input = input}}
                                            onFocus={this.selectOnFocus.bind(this)}
                                            className="form-control text-right" 
                                            defaultValue={this.props.cheque.monto || 0}
                                            onChange={(e) => {
                                                // this.props.changeTipoPago('cheque', {...this.props.cheque, monto: e.target.value})
                                            }}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="">Banco:</label>
                                        <input 
                                            type="text" 
                                            ref={(input) => {this.banco_cheque_input = input}}
                                            className="form-control" 
                                            defaultValue={this.props.cheque.banco || ''}
                                            onChange={(e) => {
                                                // this.props.changeTipoPago('cheque', {...this.props.cheque, banco: e.target.value})
                                            }}
                                        />
                                    </div>


                                    <div className="row">
                                        <div className="form-group col">
                                            <label htmlFor="">No. Cuenta:</label>
                                            <input 
                                                type="text" 
                                                ref={(input) => {this.no_cuenta_cheque_input = input}}
                                                className="form-control" 
                                                onChange={(e) => {
                                                    // this.props.changeTipoPago('cheque', {...this.props.cheque, no_cuenta: e.target.value})
                                                }}
                                                defaultValue={this.props.cheque.no_cuenta || ''}
                                            />
                                        </div>

                                        <div className="form-group col">
                                            <label htmlFor="">No. Cheque:</label>
                                            <input 
                                                type="text" 
                                                ref={(input) => {this.no_cheque_cheque_input = input}}
                                                className="form-control" 
                                                onChange={(e) => {
                                                    // this.props.changeTipoPago('cheque', {...this.props.cheque, no_cheque: e.target.value})
                                                }}
                                                defaultValue={this.props.cheque.no_cheque || ''}
                                            />
                                        </div>
                                    </div>
                                </div>
                                }

                                { pagarTarjeta && 
                                <div>
                                    <div className="form-group">
                                        <label htmlFor="">Monto:</label>
                                        <input 
                                            type="text" 
                                            ref={(input) => {this.monto_tarjeta_input = input}}
                                            onKeyPress={e => {
                                                if (habilitarPinpad || habilitarProsepago) {
                                                    this.handleKeyPress(e)
                                                } else {
                                                    if (e.key === 'Enter' && this.no_tarjeta_tarjeta_input) {
                                                        this.no_tarjeta_tarjeta_input.focus()
                                                    }
                                                }
                                            }}
                                            onFocus={this.selectOnFocus.bind(this)}
                                            className="form-control text-right" 
                                            onChange={(e) => {
                                                // this.props.changeTipoPago('tarjeta', {...this.props.tarjeta, monto: e.target.value})
                                            }}
                                            defaultValue={this.props.tarjeta.monto || 0}
                                        />
                                    </div>

                                    { ((!habilitarPinpad && !habilitarProsepago) || this.props.otraTerminalProsepago) &&
                                        <div>
                                            <div className="form-group">
                                                <label htmlFor="">No. Tarjeta:</label>
                                                <input 
                                                    type="text" 
                                                    ref={(input) => {this.no_tarjeta_tarjeta_input = input}}
                                                    className="form-control" 
                                                    onChange={(e) => {
                                                        // this.props.changeTipoPago('tarjeta', {...this.props.tarjeta, no_tarjeta: e.target.value})
                                                    }}
                                                    onKeyPress={e => {
                                                        this.handleKeyPress(e)
                                                    }}
                                                    defaultValue={this.props.tarjeta.no_tarjeta || ''}
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label htmlFor="">Tipo:</label>
                                                <select 
                                                    className="form-control" 
                                                    ref={(input) => {this.tipo_tarjeta_tarjeta_input = input}}
                                                    onChange={(e) => {
                                                        // this.props.changeTipoPago('tarjeta', {...this.props.tarjeta, tipo_tarjeta: e.target.value})
                                                    }}
                                                    defaultValue={this.props.tarjeta.tipo_tarjeta || 'debito'}
                                                    >
                                                    <option value="">-----</option>
                                                    <option value="debito">Débito</option>
                                                    <option value="credito">Crédito</option>
                                                </select>
                                            </div>
                                        </div>
                                    }

                                    { (habilitarPinpad && habilitarProsepago) &&
                                        <div className="text-center mt-2">
                                            <button className={`btn btn-${pinpadSeleccionado === 'prosepago' ? 'primary' : 'light'}`} onClick={e => {
                                                this.props.seleccionarPinpad('prosepago')
                                            }}>Prosepago {this.props.configuracion.terminal ? 'Terminal #' + this.props.configuracion.terminal.numero : ''}</button>
                                            <button className={`btn btn-${pinpadSeleccionado === pinpad.banco ? 'primary' : 'light'}`} onClick={e => {
                                                this.props.seleccionarPinpad(pinpad.banco)
                                            }}>Pinpad {pinpad.banco}</button>
                                        </div>
                                    }

                                    { habilitarProsepago &&
                                    <div className="form-group mt-1">
                                        <label className="control control-checkbox">
                                            Usar otra terminal
                                            <input checked={this.props.otraTerminalProsepago} onChange={() => {this.props.toggleOtraTerminalProsepago()}} type="checkbox"/>
                                            <span className="control_indicator"></span>
                                        </label>
                                    </div>
                                    }

                                    { pinpadModoPruebas &&
                                        <div className="alert alert-danger mt-2 p-2">
                                            <i className="ion-alert-circled"></i> Los pagos con tarjeta están en modo de pruebas, ingrese a <Link className="text-danger" to="/configuracion">configuración</Link> para cambiar esta opción.
                                        </div>
                                    }
                                </div>
                                }

                                { pagarTransferencia && 
                                <div>
                                    <div className="form-group">
                                        <label htmlFor="">Monto:</label>
                                        <input 
                                            type="text" 
                                            ref={(input) => {this.monto_transferencia_input = input}}
                                            onKeyPress={e => {
                                                if (e.key === 'Enter' && this.cta_bancaria_transferencia_input) {
                                                    this.cta_bancaria_transferencia_input.focus()
                                                }
                                            }}
                                            onFocus={this.selectOnFocus.bind(this)}
                                            className="form-control text-right" 
                                            onChange={(e) => {
                                                // this.props.changeTipoPago('transferencia', {...this.props.transferencia, monto: e.target.value})
                                            }}
                                            defaultValue={this.props.transferencia.monto || 0}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="">Cta. Bancaria:</label>
                                        <input 
                                            type="text" 
                                            ref={(input) => {this.cta_bancaria_transferencia_input = input}}
                                            className="form-control" 
                                            onChange={(e) => {
                                                // this.props.changeTipoPago('tarjeta', {...this.props.tarjeta, no_tarjeta: e.target.value})
                                            }}
                                            onKeyPress={e => {
                                                this.handleKeyPress(e)
                                            }}
                                            defaultValue={this.props.transferencia.cta_bancaria || ''}
                                        />
                                    </div>
                                </div>
                                }

                                { pagarFondo &&
                                <div>
                                    <table className="table table-striped table-sm vm">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th className="text-right">Total</th>
                                                <th className="text-right">Saldo</th>
                                                <th className="text-right">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        { this.props.cliente.fondo.map(f => {
                                            let getValue = (f) => {
                                                let aplicaciones = this.state.fondo.aplicaciones || {}
                                                if ((f.id in aplicaciones)) {
                                                    return aplicaciones[f.id].monto
                                                }
                                                
                                                return 0
                                            }

                                            return (
                                            <tr key={`fondo-${f.id}`}>
                                                <td>{moment(f.fecha).format('DD/MM/YYYY')}</td>
                                                <td className="text-right">${formatCurrency(f.total)}</td>
                                                <td className="text-right">${formatCurrency(f.saldo)}</td>
                                                <td style={{width: '150px'}}>
                                                    <input
                                                      type="number" 
                                                      min="0"
                                                      className="form-control text-right"
                                                      onFocus={this.selectOnFocus.bind(this)}
                                                      onKeyPress={this.handleKeyPress.bind(this)}
                                                      value={ getValue(f) }
                                                      onChange={(e) => {
                                                            let aplicaciones = this.state.fondo.aplicaciones || {}
                                                            let montoTotal = 0
                                                            let monto = +e.target.value

                                                            if (! monto) { 
                                                                delete aplicaciones[f.id]
                                                            }

                                                            aplicaciones[f.id] = {id: f.id, monto: monto}

                                                            for(let k in aplicaciones) {
                                                                montoTotal += aplicaciones[k].monto
                                                            }
                                                            
                                                            this.setState({
                                                                fondo: {
                                                                    ...this.state.fondo,
                                                                    monto: montoTotal,
                                                                    aplicaciones: aplicaciones
                                                                }
                                                            })
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                            )
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                                }

                                { pagarMonedero &&
                                <div className="form-group">
                                    <label htmlFor="">Monto:</label>
                                    <input 
                                        type="text" 
                                        ref={(input) => {this.monto_monedero_input = input}}
                                        onKeyPress={this.handleKeyPress.bind(this)}
                                        onFocus={this.selectOnFocus.bind(this)}
                                        className="form-control text-right" 
                                        defaultValue={this.props.monedero.monto || 0}
                                        onChange={(e) => {this.props.changeTipoPago('monedero', {...this.props.tarjeta, monto: e.target.value})}}
                                    />
                                </div>
                                }
                            </div>

                            <hr className="mt-2 mb-2" />
                            <div className="text-right">
                                { (pagarTarjeta && (habilitarPinpad || habilitarProsepago)) &&
                                    <button className="btn btn-link text-info" onClick={this.mostrarModalPagosTarjeta.bind(this)} tabIndex="-1">Usar Múltiples Tarjetas</button>
                                }
                                <button className="btn btn-secondary mr-2" onClick={(e) => { this.setState({metodoPagoModal: null}) }} tabIndex="-1">Cancelar</button>
                                <button className="btn btn-primary" onClick={this.agregarPago.bind(this)}>Aceptar</button>
                            </div>
                        </div>
                        }
            
                        { modalRecarga && 
                        <div className="dialog-box modalRecarga">
                            <div className="text-primary text-center h5">{modalRecarga.titulo}</div>
                            <div className="form-group">
                                <label htmlFor="">Número telefónico:</label>
                                <input 
                                    autoFocus 
                                    maxlength="10" 
                                    type="text" 
                                    className="form-control" 
                                    ref={(input) => {this.no_telefono_input = input}}
                                    onKeyPress={e => {
                                        if (e.key === 'Enter' && this.no_telefono_confirm_input) {
                                            this.no_telefono_confirm_input.focus()
                                        }
                                    }}
                                 />
                            </div>

                            <div className="form-group">
                                <label htmlFor="">Confirmar número telefónico:</label>
                                <input 
                                    maxlength="10" 
                                    type="text" 
                                    className="form-control" 
                                    ref={(input) => {this.no_telefono_confirm_input = input}}
                                    onKeyPress={e => {
                                        if (e.key === 'Enter') {
                                            this.setNumeroRecarga(modalRecarga.producto)
                                        }
                                    }} 
                                />
                            </div>

                            <div className="form-group text-right">
                                <button className="btn btn-secondary mr-2" onClick={(e) => {this.setState({modalRecarga: null})}} tabIndex="-1">
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" onClick={this.setNumeroRecarga.bind(this, modalRecarga.producto)}>
                                    Aceptar
                                </button>
                            </div>
                        </div>
                        }

                        { modalServicioLdi && 
                        <div className="dialog-box modalServicioLdi">
                            <div className="text-primary text-center h5">{modalServicioLdi.titulo}</div>
                            
                            <div className="form-group">
                                <label htmlFor="">Monto:</label>
                                <InputNumber
                                  autoFocus
                                  style={{ width: '100%' }}
                                  defaultValue={0}
                                  ref={(input) => {this.monto_servicio_ldi_input = input}}
                                  onFocus={this.selectOnFocus.bind(this)}
                                  className="text-right" 
                                />
                            </div>

                            { Boolean(modalServicioLdi.producto.producto.complementario) &&
                            <div className="form-group">
                                <div className="text-info">
                                    Comisión por transacción: <b>${formatCurrency(modalServicioLdi.producto.producto.complementario.precio_venta)}</b>
                                </div>
                            </div>
                            }

                            <div className="form-group">
                                <label htmlFor="">Referencia:</label>
                                <input  
                                    type="text" 
                                    className="form-control" 
                                    ref={(input) => {this.referencia_servicio_ldi_input = input}}
                                    onKeyPress={e => {
                                        if (e.key === 'Enter') {
                                            this.setServicioLdi(modalServicioLdi.producto)
                                        }
                                    }}
                                 />
                            </div>

                            <div className="form-group text-right">
                                <button className="btn btn-secondary mr-2" onClick={(e) => {this.setState({modalServicioLdi: null})}} tabIndex="-1">
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" onClick={this.setServicioLdi.bind(this, modalServicioLdi.producto)}>
                                    Aceptar
                                </button>
                            </div>
                        </div>
                        }

                        { modalAutorizacion &&
                        <div className="dialog-box modalAutorizacion">
                            <div className="text-primary text-center h5">Clave de autorización</div>
                            <div className="text-center text-muted">{modalAutorizacion.tipo_autorizacion}</div>
                            { modalAutorizacion.mensajeInfo &&
                                <div className="text-info b text-center" dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(modalAutorizacion.mensajeInfo, {
                                        allowedTags: false,
                                        allowedAttributes: false,
                                    })
                                }} />
                            }
                            { modalAutorizacion.mensajeWarning &&
                                <div className="text-warning b text-center" dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(modalAutorizacion.mensajeWarning, {
                                        allowedTags: false,
                                        allowedAttributes: false,
                                    })
                                }} />
                            }

                            <div className="form-group">
                                <label htmlFor="">Ingresar clave:</label>
                                <input 
                                    autoFocus 
                                    type="password" 
                                    className="form-control" 
                                    ref={(input) => {this.clave_autorizacion_input = input}} 
                                    onKeyUp={(e) => {
                                        if(e.key === 'Enter') {
                                            this.setClaveAutorizacion()
                                        }
                                    }}
                                />
                            </div>

                            <div className="form-group text-right mt-2">
                                <button className="btn btn-secondary mr-2" onClick={this.cancelarAutorizacion.bind(this)} tabIndex="-1">
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" onClick={this.setClaveAutorizacion.bind(this)}>
                                    Aceptar
                                </button>
                            </div>
                        </div>
                        }

                        { modalPromocionesProducto &&
                        <PromocionesProductoComponent 
                            producto={modalPromocionesProducto.producto.producto}
                            handleCerrar={(e) => { this.setState({modalPromocionesProducto: null})}}>
                        </PromocionesProductoComponent>
                        }

                        { modalUmProducto &&
                        <div className="dialog-box modalAutorizacion">

                            <p className="text-info text-center">{modalUmProducto.producto.producto.descripcion}</p>

                            <div className="form-group">
                                <label htmlFor="">Seleccionar unidad de medida:</label>
                                <select className="form-control" ref={(input) => {this.um_producto_input = input}}>
                                    { modalUmProducto.producto.producto.ums.map(um => {
                                        return <option value={um.id} key={`ump-${um.id}`}>{um.nombre}</option>
                                    })}
                                </select>
                            </div>

                            <div className="form-group text-right mt-2">
                                <button className="btn btn-secondary mr-2" onClick={(e) => this.setState({modalUmProducto: null})} tabIndex="-1">
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" onClick={this.setUmProducto.bind(this)}>
                                    Aceptar
                                </button>
                            </div>
                        </div>
                        }

                        { modalEditarProducto &&
                        <div className="dialog-box modalAutorizacion">
                            <div className="text-primary text-center h5">Editar producto</div>
                            <div className="text-info text-center text-bold">{modalEditarProducto.producto.producto.descripcion}</div>
                            { modalEditarProducto.producto.producto.venta_cb_cantidad &&
                            <div className="form-group">
                                <label htmlFor="">Restar Cantidad (Gramos):</label>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    onChange={(e) => {
                                        let v = +e.target.value.replace(/\D/g,'') / 1000
                                        let cant = this.state.modalEditarProducto.producto.cantidad - v
                                        if(cant > 0) {
                                            this.changeProductoEdicion('cantidad', +cant.toFixed(2))
                                        } else {
                                            this.changeProductoEdicion('cantidad', this.state.modalEditarProducto.producto.cantidad)
                                        }
                                    }} 
                                    onKeyUp={(e) => {
                                        if(e.key === 'Enter') {
                                            this.editarProducto()
                                        }
                                    }}
                                autoFocus/>
                                <span className="text-info">Cantidad final: {this.state.modalEditarProducto.cantidad}</span>
                            </div>
                            }

                            { !Boolean(this.props.usuario.autorizaciones.modificar_cantidad_nota) && 
                                <div>
                                    <hr className="mb0" />

                                    <div className="form-group">
                                        <label htmlFor="">Clave de autorización:</label>
                                        <input  
                                            type="password" 
                                            className="form-control" 
                                            ref={(input) => {this.clave_autorizacion_input = input}} 
                                            onKeyUp={(e) => {
                                                if(e.key === 'Enter') {
                                                    this.editarProducto()
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            }

                            <div className="form-group text-right mt-2">
                                <button className="btn btn-secondary mr-2" onClick={() => {this.setState({modalEditarProducto: null})}} tabIndex="-1">
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" onClick={this.editarProducto.bind(this)}>
                                    Aceptar
                                </button>
                            </div>
                        </div>
                        }

                        { cobrarMultipleTarjeta &&
                        <CobrosTarjetaComponent
                            cobros={this.props.tarjeta.cobros}
                            cobroMax={porPagar}
                            modoPruebas={pinpadModoPruebas}
                            onClose={() => {
                                this.setState({
                                    metodoPagoModal: null,
                                    cobrosTarjeta: {
                                        ...this.state.cobrosTarjeta,
                                        visible: false,
                                    }
                                })
                            }}
                            integracion={this.state.integracionPinpad}
                            infoTarjeta={this.state.cobrosTarjeta.infoTarjeta}
                            onCancelarOperacion={this.cancelarOperacionTarjeta.bind(this)}
                            onConsultarDatos={this.obtenerInfoTarjeta.bind(this)}
                            onCobrar={this.cobrarTarjeta.bind(this)}
                        ></CobrosTarjetaComponent>
                        }

                        { modalFechaEntrega &&
                            <FechaEntregaComponent
                            fecha={this.props.fechaEntregaDomicilio.fecha}
                            horaA={this.props.fechaEntregaDomicilio.horaA}
                            horaB={this.props.fechaEntregaDomicilio.horaB}
                            handleAceptar={(fecha_entrega) => {
                                debugger
                                this.props.entregarDomicilio(fecha_entrega)
                                this.setState({
                                    modalFechaEntrega: {
                                        ...this.state.modalFechaEntrega,
                                        visible: false
                                    }
                                })
                            }}
                            handleCancelar={() => {
                                this.setState({
                                    modalFechaEntrega: {
                                        ...this.state.modalFechaEntrega,
                                        visible: false
                                    }
                                })
                            }}
                            ></FechaEntregaComponent>
                        }
                    </div>
                </div>
            </Shortcuts>
        )
    }
}


const mapStateToProps = state => ({
    ...state.puntoVenta,
    configuracion: state.app.configuracion,
    usuario: state.app.usuario,
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({
    seleccionarDireccionEntrega, 
    seleccionarProducto,
    autocompleteProducto,
    autocompleteCliente, 
    seleccionarCliente,
    seleccionarMetodoPago,
    eliminarProducto,
    cargando,
    entregarDomicilio,
    requerirFactura,
    guardarVenta,
    setUmProducto,
    actualizarProductoInline,
    seleccionarUsoCFDI,
    infoExtraChange,
    mensajeFlash,
    mostrarAlerta,
    cargarVentaEspera,
    eliminarVentaEspera,
    setClienteAc,
    setVentaEspera,
    setProductosAc,
    seleccionarPinpad,
    nuevaVenta,
    changeTipoPago,
    toggleOtraTerminalProsepago,
    concluirVenta,
    setProp,
    cerrarVenta,
    setClientesAc
}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PuntoVentaComponent);