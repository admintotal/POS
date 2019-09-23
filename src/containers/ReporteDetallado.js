import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import TituloComponent from '../components/TituloComponent';
import * as Api from '../api';
import moment from 'moment';
import formatCurrency from 'format-currency';
import { 
    cargando,
    verVenta,
    mostrarAlerta
} from '../actions';
import {arrayDiff, isEnv} from '../helpers';
import * as Impresora from '../impresoras';

class ReporteDetallado extends React.Component {

	constructor(props) {
		super(props)

		this.id = this.props.match.params.id
		this.tipo = this.props.match.params.tipo

		this.reportes = {
			'sesion-caja': {
				titulo: 'Sesión de Caja',
				obtenerDatos: Api.getSesionCajaDetalle,
				render: this.renderSesionCaja.bind(this)
			}
		}

		this.state = {
			datos: null,
			validacionVentas: null
		}
	}

	obtenerTitulo() {
		return this.reportes[this.tipo].titulo
	}

	obtenerDatos(mostrarCargando=true) {
		this.props.cargando(mostrarCargando)

		this.reportes[this.tipo].obtenerDatos(this.props.api_key, this.id).then((resp) => {
			this.setState({datos: resp.datos})
			this.validarVentasAt()
			this.props.cargando(false)
		}).catch(e => {
			console.error(e)
			this.props.cargando(false)
			return false
		})
	}

	componentDidMount() {
		this.obtenerDatos()
	}

	mostrarDatos() {
		return this.reportes[this.tipo].render()
	}

	async validarVentasAt(e) {
		let getFoliosVentas = () => {
			let f = []
			this.state.datos.ventas.map(v => {
				return f.push(v.folio)
			})
			return f
		}

		let getChunks = (a, size=200) => {
			var arrays = [];

			while (a.length > 0)
			    arrays.push(a.splice(0, size));

			return arrays
		}

		let buttonText = this.btnValidarVentas.innerText
		if (this.btnValidarVentas) {
			this.btnValidarVentas.disabled = true
			this.btnValidarVentas.innerText = 'Consultando información...'
		}
		
		let folios = getFoliosVentas()
		let chunks = getChunks(folios.slice())
		let out = {}
		for (var i = chunks.length - 1; i >= 0; i--) {
			let data = {
				folios: chunks[i], 
				cajeroId: this.state.datos.cajero.id,
				fechaSesion: this.state.datos.inicio.fecha
			}
			try{
				let res = await Api.validarVentasAt(this.props.api_key, data)
				out = {...out, ...res.datos}
			} catch(e) {
				this.props.mostrarAlerta({
					mensaje: e.message
				})
				break
			}
		}

		if (this.btnValidarVentas) {
			this.btnValidarVentas.disabled = false
			this.btnValidarVentas.innerText = buttonText
		}

		let validacionVentasDif =  arrayDiff(folios, Object.keys(out))

		this.setState({
			validacionVentas: out,
			validacionVentasDif: validacionVentasDif
		})

	}

	imprimirCortePinpad() {
		Impresora.imprimirCortePinPad(this.props.api_key, this.state.datos.fin._id)
        .then(() => {

        })
        .catch((err) => {
            this.props.mensajeFlash('error', 'Hubo un error al imprmir el voucher.')

        })
	}

	imprimirRetiro(retiro) {
        Impresora.imprimirRetiroEfectivo(this.props.api_key, retiro._id)
        .then(() => {

        })
        .catch((err) => {
            this.props.mensajeFlash('error', 'Hubo un error al imprmir el voucher.')

        })
    }

    imprimirFondoCaja(tipo) {
    	Impresora.imprimirFondoCaja(tipo, this.props.api_key,this.state.datos[tipo]._id)
    }

	renderSesionCaja() {

		return (
			<div className="row">
				<div className="col-md-7">
					<fieldset>
						<h4 className="text-primary">{this.state.datos.cajero.username}</h4>
						<div className="row">
							<div className="col">
								<div className="upper text-muted"><small>Apertura:</small></div>
								<h4 className="text-success">{moment(this.state.datos.inicio.fecha).format('DD/MM/YYYY HH:mm:ss')}</h4>
							</div>
							{ this.state.datos.fin &&
							<div className="col">
								<div className="upper text-muted"><small>Cierre:</small></div>
								<h4 className="text-dark">{moment(this.state.datos.fin.fecha).format('DD/MM/YYYY HH:mm:ss')}</h4>
							</div>
							}
						</div>
					</fieldset>
				</div>
				<div className="col-md-5">
					<div className="row mb-2">
						<div className="col">
							<button onClick={this.imprimirFondoCaja.bind(this, "inicio")} className="btn btn-light btn-block">
								<i className="ion-printer"></i> Apertura de caja
							</button>
						</div>
						{Boolean(this.state.datos.fin) &&
						<div className="col">
							<button onClick={this.imprimirFondoCaja.bind(this, "fin")} className="btn btn-light btn-block">
								<i className="ion-printer"></i> Cierre de caja
							</button>
						</div>
						}
					</div>

					{ Boolean(this.state.datos.fin && this.state.datos.fin.corte_pinpad && this.state.datos.fin.corte_pinpad.transacciones) &&
						<button ref={button => this.btnImprimirCortePinpad = button } onClick={this.imprimirCortePinpad.bind(this)} className="btn btn-light btn-block">
							<i className="ion-printer"></i> Corte pinpad
						</button>
					}
					<button ref={button => this.btnValidarVentas = button } onClick={this.validarVentasAt.bind(this)} className="btn btn-primary btn-block">
						Validar ventas con admintotal
					</button>
				</div>
				<div className="col-md-7">
					<h4 className="text-primary">{this.state.datos.ventas.length} Ventas</h4>
					<fieldset style={{height:"65vh","overflow": "auto"}}>
						<table className="table table-condensed vm table-hover table-list table-striped clickeable">
							<thead>
								<tr>
									<th>Sinc.</th>
	                                <th>Folio</th>
	                				<th>Fecha</th>
	                				<th className="text-right">Total</th>
	                				{ Boolean(this.state.validacionVentas && !isEnv('production')) &&
	                				<th className="text-right">Total AT</th>
	                				}
								</tr>
							</thead>
							<tbody>
								{ this.state.datos.ventas.map((v, i) => {
									let editable = false
									let totalAt = null
									let origTotal = formatCurrency(v.total)
									let trCssClass = ''


									if (this.state.validacionVentas) {
										if (this.state.validacionVentas[v.folio]) {
											totalAt = formatCurrency(this.state.validacionVentas[v.folio].total)
											editable = Boolean(this.state.validacionVentas[v.folio].editable)
											if (origTotal !== totalAt) {
												trCssClass = 'table-danger'
												if (Math.abs(v.total - this.state.validacionVentas[v.folio].total) < 1) {
													trCssClass = 'table-warning'
													if ( isEnv('production') ) {
														trCssClass = ''
													}
												}
											}
										} else {
											trCssClass = 'table-danger'
										}
									}

									return (
										<tr 
											key={`sv-${i}`} 
											className={trCssClass} 
											title={v.motivoError || ''} 
											onClick={() => {
												this.props.verVenta(v, editable, {
													onReenviarVenta: (res) => {this.obtenerDatos(false); this.props.verVenta(null)},
													onSincronizarVenta: (res) => {this.obtenerDatos(false); this.props.verVenta(null)},
												})
											}}
										>
											<td>
												{ v.sincronizada ? 
												<span className="badge badge-success">Si</span> : 
												<span className="badge badge-danger">No</span> }
											</td>
											<td>
												{ v.requiereFactura ? 
	                                            '-----' : 
	                                            ( v.numero_serie ? (v.numero_serie + '-' + v.folio) : v.folio )
	                                            }
											</td>
											<td>{moment(v.fecha).format('DD/MM/YYYY HH:mm:ss')}</td>
											<td className="text-right">${origTotal}</td>
											{<td title="Admintotal" className="text-right font-weight-bold">
											{ Boolean(totalAt && !isEnv('production')) &&
												<span>${totalAt}</span>
											}
											</td>}
										</tr>
									)
								})}
							</tbody>
						</table>
					</fieldset>
				</div>
				<div className="col-md-5">
					<h4 className="text-primary">{this.state.datos.retiros.length} Retiros</h4>
					<fieldset>
						<table className="table table-condensed vm table-hover table-list table-striped">
							<thead>
								<tr>
									<th>Sinc.</th>
	                				<th>Fecha</th>
	                                <th className="text-right">Total</th>
	                                <th></th>
								</tr>
							</thead>
							<tbody>
								{ this.state.datos.retiros.map((v, i) => {
									return (<tr key={`sr-${i}`}>
										<td>{v.sincronizado ? 
											<span className="text-success">Si</span> : 
											<span className="text-danger">No</span>
										}</td>
										<td>{moment(v.fecha).format('DD/MM/YYYY HH:mm:ss')}</td>
										<td className="text-right font-weight-bold text-success">${formatCurrency(v.totalFondo)}</td>
										<td className="text-right">
											<button 
                                                onClick={this.imprimirRetiro.bind(this, v)} 
                                                title="Imprimir" 
                                                className="btn btn-sm btn-secondary" >
                                                <i className="ion-printer"></i>
                                            </button>
										</td>
									</tr>)
								})}
							</tbody>
						</table>
					</fieldset>
				</div>
			</div>
		)
	}
	
    render() {
        return (
        	<div className="ReporteDetallado">
        		<TituloComponent texto={`${this.obtenerTitulo()}`}></TituloComponent>
        		<div className="container-fluid">
        			{ this.state.datos &&
            			<div>{ this.mostrarDatos() }</div>
        			}

            	</div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    configuracion: state.app.configuracion,
    api_key: state.app.api_key
});


const mapDispatchToProps = dispatch => bindActionCreators({cargando, verVenta, mostrarAlerta}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(ReporteDetallado);