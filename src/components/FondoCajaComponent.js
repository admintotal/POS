import React from 'react';
import formatCurrency from 'format-currency';
import { Link } from 'react-router-dom';
import {obtenerAlmacenes} from '../actions';
import {abrirCaja, seleccionarAlmacen} from '../actions/puntoVentaActions';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as Api from '../api';
import moment from 'moment';
import TituloComponent from './TituloComponent';
import { mensajeFlash } from '../actions';

class FondoCajaComponent extends React.Component {
	constructor(props) {
		super(props)

		let titulos = {
    		retiro: 'Retirar Efectivo',
    		abrirCaja: 'Abrir Caja',
    		cerrarCaja: 'Cerrar Caja',
    	}
		
		this.state = {
			totalFondo: 0,
			titulo: titulos[this.props.tipo],
			almacen: this.props.almacen,
			fecha: moment().format(''),
			abrirCajaBoton: {
				habilitado: true,
				texto: titulos[this.props.tipo],
			},
			denominaciones: [
		        {denominacion: 1000, label: '$1000', cantidad: 0, importe: 0},
		        {denominacion: 500, label: '$500', cantidad: 0, importe: 0},
		        {denominacion: 200, label: '$200', cantidad: 0, importe: 0},
		        {denominacion: 100, label: '$100', cantidad: 0, importe: 0},
		        {denominacion: 50, label: '$50', cantidad: 0, importe: 0},
		        {denominacion: 20, label: '$20', cantidad: 0, importe: 0},
		        {denominacion: 10, label: '$10', cantidad: 0, importe: 0},
		        {denominacion: 5, label: '$5', cantidad: 0, importe: 0},
		        {denominacion: 2, label: '$2', cantidad: 0, importe: 0},
		        {denominacion: 1, label: '$1', cantidad: 0, importe: 0},
		        {denominacion: .50, label: '.50¢', cantidad: 0, importe: 0},
		        {denominacion: .20, label: '.20¢', cantidad: 0, importe: 0},
		        {denominacion: .10, label: '.10¢', cantidad: 0, importe: 0},
		    ],
		}
	}

	changeCantidad(d, event) {
		let denominaciones = this.state.denominaciones;
		let index = denominaciones.findIndex((e) => e.denominacion === d.denominacion);
		
		d.cantidad = Number(event.target.value);
		d.importe = d.denominacion * d.cantidad;

		let totalFondo = 0;
		denominaciones[index] = d;
		denominaciones.map((i) => totalFondo += i.importe)

		this.setState({
			totalFondo,
			denominaciones: denominaciones
		});
	}

	getFondoData() {
		let denominaciones = []
		this.state.denominaciones.map((d) => {
			return denominaciones.push({cantidad:d.cantidad, denominacion:d.denominacion})
		})
		return {
			totalFondo: this.state.totalFondo,
			cajero: this.props.cajero,
			almacen: this.state.almacen || this.props.almacenes[0],
			fecha: moment().format(),
			denominaciones: denominaciones,
		}
	}

	handleAlmacen(ev) {
		let almacen = this.props.almacenes.find(i => { return i.id === Number(ev.target.value)});
		this.setState({
			...this.state,
			almacen: almacen
		});
	}

	handleSubmit() {
		let data = this.getFondoData()

		switch(this.props.tipo) {
			case "abrirCaja":
				this.setState({
					abrirCajaBoton: {
						texto: 'Cargando...',
						habilitado: false
					}
				})
				break;

			case "cerrarCaja":
				this.setState({
					abrirCajaBoton: {
						texto: 'Cargando...',
						habilitado: false
					}
				})
				break;

			case "retiro":
				data = {
					retiro: data,
					sesion_caja: this.props.sesionActiva
				}

				if (data.retiro.totalFondo <= 0) {
		            return this.props.mensajeFlash('error', `El monto a retirar no puede ser ${data.retiro.totalFondo}`)
		        }

		        this.setState({
					abrirCajaBoton: {
						texto: 'Cargando...',
						habilitado: false
					}
				})

		        if (!this.props.cajero.autorizaciones.autorizacion_retiro_caja) {
		        	let clave = this.clave_autorizacion_input.value.trim()
		        	if (! clave ) {
				        this.setState({
							abrirCajaBoton: {
								texto: this.state.titulo,
								habilitado: true
							}
						})

		        		return this.props.mensajeFlash('error', "Ingrese la clave de autorización")
		        	}
		        	
					return Api.validarAutorizacion(this.props.api_key, {clave: clave, autorizacion: 'autorizacion_retiro_caja'})
					.then((response) => {
						if (response.autorizado) {
							data.retiro.usuario_autorizacion = response.responsable
							this.props.onSubmit(data)
						} else {
							this.props.mensajeFlash('error', "La clave de autorización es incorrecta.")
							this.clave_autorizacion_input.select()
				        	this.setState({
								abrirCajaBoton: {
									texto: this.state.titulo,
									habilitado: true
								}
							})
						}
					})
		        	
		        }
				break;

			default:
				break;
		}

		this.props.onSubmit(data)
	}

    render() {
    	let titulo = this.state.titulo
    	let submitButton = () => {
    		if (this.props.ventasEspera.length) {
    			return (
	    			<div className="alert alert-danger">Tiene {this.props.ventasEspera.length} ventas en espera.</div>
	    		)
    		}

    		return (
    			<button 
					onClick={this.handleSubmit.bind(this)} 
					className="btn btn-primary btn-lg btn-block"
					disabled={!this.state.abrirCajaBoton.habilitado}
					>
					{this.state.abrirCajaBoton.texto}
				</button>
    		)
    	}

        return (
        	<div className="FondoCaja">
        		<TituloComponent texto={titulo}></TituloComponent>

	            <div className="row">
	            	<div className="col-6">
	            		<fieldset>
		            		<table className="table table-condensed vm m-0">
		            			<thead>
		            				<tr>
		            					<th>Denominación</th>
		            					<th className="text-right">Cantidad</th>
		            					<th className="text-right">Importe</th>
		            				</tr>
		            			</thead>
		            			<tbody>
		            				{ this.state.denominaciones.map((d) => {
			            				return (
			            				<tr key={`denominacion-${d.denominacion}`}>
			            					<td>{d.label}</td>
			            					<td>
			            						<input 
			            							onChange={this.changeCantidad.bind(this, d)}
			            							type="number" 
			            							min="0"
			            							defaultValue={d.cantidad} 
			            							className="form-control text-right" />
			            					</td>
			            					<td className="text-right">${formatCurrency(d.importe)}</td> 
			            				</tr>
			            				)
		            				})}
		            			</tbody>
		            		</table>
	            		</fieldset>
	            	</div>
	            	<div className="col">
	            		<fieldset>
		            		<table className="table table-condensed vm m-0">
		            			<tbody>
			            			<tr>
			            				<th>{this.props.configuracion.inventario.palabra_almacen}:</th>
			            				<td className="text-right">
			            					{ (this.props.sesionActiva && this.props.sesionActiva.almacen) ?
			            					<b>{this.props.sesionActiva.almacen.nombre}</b>
			            					:
											<b>{this.props.almacen ? this.props.almacen.nombre : '------'}</b>
											}
			            				</td>
			            			</tr>
			            			<tr>
			            				<th>Cajero:</th>
			            				<td className="text-right">
			            					{this.props.cajero.username}
			            				</td>
			            			</tr>
			            			<tr className="h4 text-primary">
			            				<th>Total:</th>
			            				<td className="text-right">
			            					${formatCurrency(this.state.totalFondo)}
			            				</td>
			            			</tr>
		            			</tbody>
		            		</table>
	            		</fieldset>

	            		{ (this.props.tipo === 'retiro' && !this.props.cajero.autorizaciones.autorizacion_retiro_caja) &&
							<div className="form-group">
	            				<hr className="mb-1" />
								<label htmlFor="">Clave de autorización:</label>
								<input 
									type="password" 
									className="form-control" 
									ref={(input) => {this.clave_autorizacion_input = input}}
									autocomplete="off"
								/>
							</div>
	            		}

	            		{ this.props.almacen ?
	            			submitButton()
							:
							<div className="alert alert-danger">
								Es necesario seleccionar un {this.props.configuracion.inventario.palabra_almacen.toLowerCase()} en la <Link className="text-danger" to="/configuracion">configuración</Link>
							</div>
						}
	            	</div>
	            </div>
            </div>
        );
    }
}

const mapStateToProps = state => {
	return {
	    api_key: state.app.api_key,
	    cajero: state.app.usuario,
	    configuracion: state.app.configuracion,
	    almacenes: state.app.almacenes,
	    almacen: state.app.configuracion.almacen,
	    ventasEspera: state.puntoVenta.ventasEspera,
	    sesionActiva: state.puntoVenta.sesionCaja
	}
}

const mapDispatchToProps = dispatch => bindActionCreators({
	abrirCaja, 
	seleccionarAlmacen, 
	obtenerAlmacenes,
	mensajeFlash
}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps,
)(FondoCajaComponent);
