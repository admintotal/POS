import React from 'react';
import formatCurrency from 'format-currency';
import moment from 'moment';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import TituloComponent from '../components/TituloComponent';
import Autocomplete from 'react-autocomplete';
import * as Api from '../api';
import { 
    ClienteAutocompleteView, 
    MenuAutocompleteView 
} from '../constants/AutocompleteTemplates';
import { 
    cargando,
    mensajeFlash,
    autocompleteCliente,
    mostrarAlerta
} from '../actions';
import { 
	seleccionarCliente,
	setClienteAc,
    setClientesAc,
    toggleEnviarCorreo,
	setAttr,
    setAbono,
    guardarPago,
    setImporte,
    limpiarForm,
    setDatosForm
} from '../actions/recepcionesPago';
import InputNumber from 'rc-input-number';
import ReactDatetime from 'react-datetime';
import '../../node_modules/react-datetime/css/react-datetime.css';
import IngresoAutorizacionComponent from '../components/IngresoAutorizacionComponent';
import * as Impresora from '../impresoras';
import {
    getClienteObj
} from '../helpers';

moment.locale('es')

class RecepcionPago extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			ac_cliente: '',
            autorizadoConfiguracion: props.usuario.autorizaciones.recepcion_pago,
		}
	}

	timeoutIdCliente = null


    consultarDatos(params={}) {
        this.props.cargando()
        Api.obtenerDatosFormPago(this.props.api_key, params)
        .then((res) => {
            if (res.status === 'error') {
                this.props.cargando(false)
                return this.props.mostrarAlerta({mensaje: res.message})
            }

            this.props.setDatosForm(res)
            
            if (!this.props.form.fecha || this.props.form.fecha === '') {
                this.props.setAttr({fecha: moment()})
            }

            this.props.cargando(false)
            if (this.clienteInput) {
                this.clienteInput.focus()
            }
        })
        .catch((err) => {
            this.props.cargando(false)
            this.props.mostrarAlerta({
                mensaje: 'Hubo un error al obtener la información con admintotal.com'
            })
        })
    }

	componentDidMount() {
        if (this.state.autorizadoConfiguracion) {
		  this.consultarDatos()
        }
	}

	onChangeCliente(ev) {
        if (ev.target.value) {
            let {autocompleteCliente, api_key} = this.props
            let q = ev.target.value
            clearTimeout(this.timeoutIdCliente)
            this.timeoutIdCliente = setTimeout(() => {
                autocompleteCliente('RPF_SET_AUTOCOMPLETE_CLIENTES', api_key, q)
            }, 600);
        }

        this.props.setAttr({ac_cliente: ev.target.value})
    }

	onSelectCliente(value, obj={}) {
        clearTimeout(this.timeoutIdCliente)
        
        if (!obj.id) {
            return false
        }

        this.props.setImporte(0)
        this.props.setAttr({abonos: {}, totalAplicado: 0})

        this.consultarDatos({
            cliente: obj.id
        })
    }

	handleClienteKeyup(e) {
        let charCode = (typeof e.which === "number") ? e.which : e.keyCode
        if (charCode === 13) {
            if (e.target.value !== "") {
                this.onSelectCliente(e.target.value)
            }
        }
    }

    handleClienteBlur(e)  {
        this.props.setClientesAc([])
    }

    onChangeBanco(e) {
        this.props.setAttr({cheque: {...this.props.form.cheque, banco: e.target.value}})
    }

    onSelectBanco(obj) {
        this.props.setAttr({cheque: {...this.props.form.cheque, banco: obj}})
    }

    getDatos() {
        let data = {}
        const state = this.props.form
        const infoValida = [
            '_id',
            'cliente',
            'cuenta',
            'fecha',
            'enviarCorreo',
            'moneda',
            'tipo_abono',
            'tipo_pago',
            'comentarios',
            'noCheque',
            'banco',
            'importe',
            'referencia',
            'totalAplicado',
            'cobrosPinpad',
            'efectivo',
            'cheque',
            'transferencia',
            'tarjeta',
            'abonos',
        ]

        for(let k in state) {
            if (infoValida.indexOf(k) > -1) {
                data[k] = state[k]
                if (k === 'fecha' && data[k] && data[k] !== '') {
                    data[k] = data[k].toISOString()
                }
            }
        }
        data.cliente = getClienteObj(data.cliente)
        data.tipos_pago_tarjeta = {
            'credito': [4, "Tarjeta de Crédito"],
            'debito': [28, "Tarjeta de débito"]
        }
        return data
    }

    guardar(confirmado=false) {
        let pago = this.getDatos()

        if (!pago.cliente.id) {
            if (this.clienteInput) {
                this.clienteInput.focus()
                return this.props.mensajeFlash('error', 'Especifique el cliente')
            }
        }

        if (!pago.fecha || pago.fecha === '') {
            if (this.pickerFecha) {
                this.pickerFecha.focus()
            }
            return this.props.mensajeFlash('error', 'Especifique la fecha del pago.')
        }

        if (!pago.tipo_pago) {
            return this.props.mensajeFlash('error', 'Especifique el tipo de pago')
        }

        if (!pago.tipo_abono) {
            return this.props.mensajeFlash('error', 'Especifique el tipo de abono')
        }


        if (pago.tipo_abono[0] === 3) {
            pago.abonos = {}
        }

        if (pago.tipo_pago[0] === 2 && !pago.cheque.banco) {
            if (this.bancoInput) {
                this.bancoInput.focus()
            }
            return this.props.mensajeFlash('error', 'Especifique el banco')
        }

        if (pago.tipo_pago[0] === 2 && !pago.cheque.noCheque) {
            if (this.noChequeInput) {
                this.noChequeInput.focus()
            }
            return this.props.mensajeFlash('error', 'Especifique el número de cheque')
        }
        
        if (pago.tipo_pago[0] === 3 && !pago.transferencia.referencia) {
            if (this.referenciaInput) {
                this.referenciaInput.focus()
            }
            return this.props.mensajeFlash('error', 'Especifique la referencia de la transferencia')
        }

        if (pago.totalAplicado > pago.importe) {
            return this.props.mostrarAlerta({
                titulo: 'Error de validación',
                mensaje: `El total aplicado ($${formatCurrency(pago.totalAplicado)}) es mayor al importe del pago ($${formatCurrency(pago.importe)})`
            })
        }

        if (this.props.form.facturas && this.props.form.facturas.length) {
            if (pago.totalAplicado === 0 && confirmado === false) {
                let _self = this
                return this.props.mostrarAlerta({
                    titulo: 'Confirme para continuar',
                    mensaje: 'El total aplicado a facturas es 0, ¿Desea generar fondo al cliente?',
                    cancelable: true,
                    handleAceptar: () => {
                        _self.guardar(_self, true)
                    }
                })
            }
        }

        this.props.cargando()
        Api.guardarRecepcionPago(this.props.api_key, pago)
        .then((res) => {
            this.props.cargando(false)
            
            if (res.status === 'error') {
                if (!res.pago) {
                    return this.props.mostrarAlerta({
                        titulo: 'Error al registrar el pago',
                        mensaje: res.message
                    })
                }
            }

            this.props.mostrarAlerta({
                titulo: 'El pago ha sido guardado',
                mensaje: res.message
            })

            if (res.imprimir) {
                if (res.pago.tarjeta.integracion && res.pago.tarjeta.integracion === 'santander') {
                    if (res.pago.tarjeta.datos.autorizacion) {
                        Impresora.imprimirVoucherPago(res.pago._id, this.props.api_key, 'comercio')
                        Impresora.imprimirVoucherPago(res.pago._id, this.props.api_key, 'cliente')
                    }
                }

                let conf = {}
                if (this.props.configuracion.impresora) {
                    conf.marginLeft = this.props.configuracion.impresora.marginLeft;
                    conf.paperWidth = this.props.configuracion.impresora.paperWidth;
                }

                Impresora.imprimirReciboPago(res.pago._id, this.props.api_key, {
                    conf: conf
                })

                // en lo que se agrega el módulo de listado y reimpresiones
                Impresora.imprimirReciboPago(res.pago._id, this.props.api_key, {
                    conf: conf
                })
            }

            this.props.limpiarForm()
            this.consultarDatos()
        })
        .catch((error) => {
            this.props.cargando(false)
            this.props.mostrarAlerta({
                titulo: 'Error al guardar el pago',
                mensaje: error.message || ''
            })
        })
    }

    onValidarAutorizacion(valido) {
        this.setState({
            autorizadoConfiguracion: valido
        })

        if (! valido ) {
            this.props.mensajeFlash('error', 'La clave ingresada es incorrecta.')
        } else {
            this.consultarDatos()
        }
    }

    async limpiarForm() {
        await this.props.limpiarForm()
        this.consultarDatos()
    }

    render() {
    	let cliente = this.props.form.cliente
        let cuentas = this.props.form.cuentas
        let bancos = this.props.form.bancos
        let facturas = this.props.form.facturas
        let tipos_abonos = this.props.form.tipos_abonos
        let tipos_pagos  = this.props.form.tipos_pagos 
        let abonos = this.props.form.abonos
        let monedas = this.props.form.monedas
        let totalAplicado = this.props.form.totalAplicado
        let diferencia = this.props.form.diferencia
        let autorizadoConfiguracion = this.state.autorizadoConfiguracion

        if (! autorizadoConfiguracion) {
            return (
                <IngresoAutorizacionComponent 
                    titulo="Requiere de autorización para recepciones de pago." 
                    api_key={this.props.api_key} 
                    nombreAutorizacion='recepcion_pago'
                    onValidar={this.onValidarAutorizacion.bind(this)}>
                </IngresoAutorizacionComponent>
            )
        }
    
        return (
            <div>
                { this.props.configuracion.general && 
                 <TituloComponent texto="Nueva Recepción de Pago"></TituloComponent>
                }
                
            	<div className="container-fluid">
                    <div className="row">
                        <div className="col-md-6">
                            <button onClick={(e) => {this.limpiarForm(); this.props.history.push('/recepciones-pago')}} className="btn btn-link text-muted font-weight-bold">
                                Cancelar
                            </button>
                        </div>
                        <div className="col-md-6 text-right">
                            <button className="btn btn-link text-danger font-weight-bold" onClick={(e) => {this.limpiarForm()}}>
                                Limpiar Formulario
                            </button>
                        </div>
                    </div>

                    <div className="row mt-2">
                        <div className="col-md-7">
							<fieldset>
                                <label className="control control-checkbox">
                                    Enviar Correo
                                    <input onChange={e => { this.props.toggleEnviarCorreo()}} type="checkbox" checked={this.props.form.enviarCorreo} />
                                    <div className="control_indicator"></div>
                                </label>

                                <div className="row">
                                    <div className="col-md-7">
        								<div className="form-group">
                                            <label htmlFor="">Cliente:</label>
                                            <Autocomplete
                                                wrapperStyle={{display:'block'}}
                                                items={this.props.form.ac_clientes || []}
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
                                                value={this.props.form.ac_cliente}
                                                onSelect={this.onSelectCliente.bind(this)}
                                            />
                                        </div>
                                        { Boolean(cliente.id) &&
                                        <div>
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
                                        </div>
                                        }
                                    </div>
                                    <div className="col-md-5">
                                        <div className="form-group">
                                            <label htmlFor="">Cuenta:</label>
                                            <select 
                                                className="form-control" 
                                                onChange={(ev) => {
                                                    if (!ev.target.value || ev.target.value === "") {
                                                        return this.props.setAttr({cuenta: null})
                                                    }

                                                    this.props.setAttr({cuenta: JSON.parse(ev.target.value)})
                                                }}
                                                value={JSON.stringify(this.props.cuenta)}>
                                                    <option value="">----</option>
                                                    {cuentas.map(c => {
                                                    return <option value={JSON.stringify(c)}>{c.label}</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="">Tipo de abono:</label>
                                            <select 
                                                onChange={e => {
                                                    this.props.setAttr({tipo_abono: JSON.parse(e.target.value)})
                                                }}
                                                value={JSON.stringify(this.props.form.tipo_abono)}
                                                className="form-control">
                                                {tipos_abonos.map(ta => {
                                                    if (+ta[0] === 2 ) {
                                                        return false
                                                    }
                                                    return <option value={JSON.stringify(ta)}>{ta[1]}</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="">Fecha:</label>
                                            <ReactDatetime
                                                ref={(picker) => {this.pickerFecha = picker }}
                                                isValidDate={(current) => {
                                                    let valid = current.isBefore(moment())
                                                    return valid
                                                }}
                                                value={this.props.form.fecha || moment()}
                                                inputProps={{
                                                    className:"form-control",
                                                    disabled: true,
                                                    onBlur: () => {
                                                        setTimeout(() => this.pickerFecha.closeCalendar(), 550)
                                                    }
                                                }}
                                                onChange={(d) => {
                                                    this.props.setAttr({fecha: moment(d)})
                                                }}
                                             />
                                        </div>
                                    </div>
                                </div>
							</fieldset>	
						</div>
						<div className="col-md-5">
							<fieldset>
                                <div className="row">
                                    <div className="col-md-7">
                                        <div className="form-group">
                                            <label htmlFor="">Importe:</label>
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                min={0}
                                                value={this.props.form.importe}
                                                onChange={(value) => {
                                                    this.props.setImporte(value)
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-5">
                                        <div className="form-group">
                                            <label htmlFor="">Moneda:</label>
                                            <select 
                                                value={JSON.stringify(this.props.form.moneda)}
                                                onChange={e => {
                                                    this.props.setAttr({moneda: JSON.parse(e.target.value)})
                                                }}
                                                className="form-control">
                                                <option value="">----</option>
                                                {monedas.map(m => {
                                                    return <option value={JSON.stringify(m)}>{m.nombre}</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="">Tipo de pago:</label>
                                    <select
                                        onChange={(e) => {this.props.setAttr({tipo_pago: JSON.parse(e.target.value)})}}  
                                        value={JSON.stringify(this.props.form.tipo_pago)}
                                        className="form-control">
                                        {tipos_pagos.map(tp => {
                                            return <option value={JSON.stringify(tp)}>{tp[1]}</option>
                                        })}
                                    </select>
                                </div>

                                {/* Cheque */}
                                { Boolean(this.props.form.tipo_pago && +this.props.form.tipo_pago[0] === 2) &&
                                    <div>
                                        <div className="form-group">
                                            <label htmlFor="">Banco:</label>
                                            <select className="form-control"
                                                ref={(inp) => this.bancoInput = inp }
                                                onChange={(e) => {this.props.setAttr({ cheque: {
                                                    ...this.props.form.cheque,
                                                    banco: e.target.value
                                                }})}}>
                                                <option value="">----</option>
                                                {bancos.map(b => {
                                                    return <option value={b.nombre}>{b.nombre}</option>
                                                })}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="">No. Cheque:</label>
                                            <input 
                                                value={this.props.form.noCheque}
                                                type="number" 
                                                ref={(inp) => this.noChequeInput = inp }
                                                onChange={(e) => {this.props.setAttr({cheque: {
                                                    ...this.props.form.cheque,
                                                    noCheque: e.target.value
                                                }})}} 
                                                className="form-control"
                                            />
                                        </div>
                                    </div>
                                }

                                {/* Transferencia */}
                                { Boolean(this.props.form.tipo_pago && +this.props.form.tipo_pago[0] === 3) && 
                                    <div className="form-group">
                                        <label htmlFor="">Referencia:</label>
                                        <input 
                                            ref={(inp) => this.referenciaInput = inp }
                                            value={this.props.form.transferencia.referencia} 
                                            onChange={(e) => {this.props.setAttr({
                                                transferencia: {...this.props.form.transferencia, referencia: e.target.value}
                                            })}} 
                                            type="text" 
                                            className="form-control"
                                        />
                                    </div>
                                }

                                {/* Tarjeta */}
                                { Boolean(this.props.form.tipo_pago && +this.props.form.tipo_pago[0] === 4 && !this.props.configuracion.habilitarPinpad) && 
                                    <div className="form-group">
                                        <label htmlFor="">Referencia:</label>
                                        <input 
                                            ref={(inp) => this.referenciaInput = inp }
                                            value={this.props.form.transferencia.referencia} 
                                            onChange={(e) => {this.props.setAttr({
                                                tarjeta: {...this.props.form.transferencia, referencia: e.target.value}
                                            })}} 
                                            type="text" 
                                            className="form-control"
                                        />
                                    </div>
                                }

                                <div className="form-group">
                                    <label htmlFor="">Comentarios:</label>
                                    <textarea value={this.props.form.comentarios} onChange={(e) => {this.props.setAttr({comentarios: e.target.value})}}  rows="2" className="form-control"></textarea>
                                </div>
                            </fieldset>
						</div>
                        <div className="col-md-12">
                            { Boolean(facturas.length && this.props.form.tipo_abono && +this.props.form.tipo_abono[0] === 1) && 
                            <fieldset>
                                <div className="row">
                                    <div className="col-md-6"></div>
                                    <div className="col-md-6 text-right">
                                        <span
                                            onClick={e => { this.props.setImporte(totalAplicado) }} 
                                            className="mr-3 d-inline-block clickeable">Total Aplicado: <b>${formatCurrency(totalAplicado)}</b></span>
                                        <span className="d-inline-block">
                                            Diferencia: <b className={(diferencia >= 0) ? '' : 'text-danger'}>${formatCurrency(diferencia)}</b>
                                        </span>
                                    </div>
                                </div>
                                <table className="table table-xs vm table-list table-hover table-list">
                                    <thead>
                                        <tr>
                                            <th>{this.props.configuracion.inventario.palabra_almacen}</th>
                                            <th>Folio</th>
                                            <th>Fecha</th>
                                            <th>Fecha Venc.</th>
                                            <th>Abono</th>
                                            <th className="text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {facturas.map(f => {
                                            return (
                                            <tr className={'clickeable '  + (((f.id in abonos) && abonos[f.id].abono > 0)? 'table-success' : '')}>
                                                <td onClick={(e) => {
                                                        if (!(f.id in abonos)) {
                                                            this.props.setAbono({
                                                                ...f,
                                                                almacen: {
                                                                    id: f.almacen.id,
                                                                    nombre: f.almacen.nombre,
                                                                },
                                                                factura: f.id,
                                                                abono: f.saldo
                                                            })
                                                        }
                                                    }}>{f.almacen.nombre}</td>
                                                <td onClick={(e) => {
                                                        if (!(f.id in abonos)) {
                                                            this.props.setAbono({
                                                                ...f,
                                                                almacen: {
                                                                    id: f.almacen.id,
                                                                    nombre: f.almacen.nombre,
                                                                },
                                                                factura: f.id,
                                                                abono: f.saldo
                                                            })
                                                        }
                                                    }}>{f.folio}</td>
                                                <td onClick={(e) => {
                                                        if (!(f.id in abonos)) {
                                                            this.props.setAbono({
                                                                ...f,
                                                                almacen: {
                                                                    id: f.almacen.id,
                                                                    nombre: f.almacen.nombre,
                                                                },
                                                                factura: f.id,
                                                                abono: f.saldo
                                                            })
                                                        }
                                                    }}>{moment(f.fecha).format('DD/MM/YYYY HH:mm')}</td>
                                                <td onClick={(e) => {
                                                        if (!(f.id in abonos)) {
                                                            this.props.setAbono({
                                                                ...f,
                                                                almacen: {
                                                                    id: f.almacen.id,
                                                                    nombre: f.almacen.nombre,
                                                                },
                                                                factura: f.id,
                                                                abono: f.saldo
                                                            })
                                                        }
                                                    }}>{moment(f.fecha_vencimiento).format('DD/MM/YYYY')}</td>
                                                <td>
                                                    <InputNumber
                                                        style={{ width: '100%' }}
                                                        min={0}
                                                        max={+f.saldo}
                                                        value={(f.id in abonos) ? abonos[f.id].abono : 0}
                                                        onChange={(value) => {
                                                            this.props.setAbono({
                                                                ...f,
                                                                almacen: {
                                                                    id: f.almacen.id,
                                                                    nombre: f.almacen.nombre,
                                                                },
                                                                factura: f.id,
                                                                abono: value
                                                            })
                                                        }}
                                                    />
                                                </td>
                                                <td 
                                                    onClick={(e) => {
                                                        if (!(f.id in abonos)) {
                                                            this.props.setAbono({
                                                                ...f,
                                                                almacen: {
                                                                    id: f.almacen.id,
                                                                    nombre: f.almacen.nombre,
                                                                },
                                                                factura: f.id,
                                                                abono: f.saldo
                                                            })
                                                        }
                                                    }}
                                                    className="text-right">
                                                    ${formatCurrency(f.saldo)} {f.moneda.nombre}
                                                </td>
                                            </tr>
                                            )
                                        })}
                                    </tbody>               
                                </table>
                            </fieldset>
                            }
                            {Boolean(this.props.form.importe > 0) &&
                            <div className="text-right">
                                <button ref={(btn) => this.btnGuardar = btn } onClick={(btn) =>{this.guardar()}} className="btn btn-primary">Guardar Recepción de Pago</button>
                            </div>
                            }
                        </div>
					</div>
				</div>
			</div>
        );
    }
}

const mapStateToProps = state => ({
    ...state.app,
    configuracion: state.app.configuracion,
    usuario: state.app.usuario,
    form: state.recepcionesPago.form,
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({
    autocompleteCliente, 
    seleccionarCliente,
    cargando,
    mensajeFlash,
    mostrarAlerta,
    setClienteAc,
    setDatosForm,
    toggleEnviarCorreo,
    setAttr,
    setAbono,
    setImporte,
    limpiarForm,
    guardarPago,
    setClientesAc
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RecepcionPago);

