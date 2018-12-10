import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import moment from 'moment';
import {
	sincronizarAlmacenes, 
	sincronizarClientes, 
	sincronizarProductos, 
	sincronizarVentas, 
	sincronizarRecepcionesPago, 
	sincronizarRetiros, 
	cancelarSincronizacion, 
	obtenerSincronizaciones
} from '../actions';
import TituloComponent from '../components/TituloComponent';


class Sincronizaciones extends React.Component {

	intervalId

	componentDidMount() {
		let {obtenerSincronizaciones, api_key} = this.props
		obtenerSincronizaciones(api_key)

		clearInterval(this.intervalId)
		this.intervalId = setInterval(() => {
			obtenerSincronizaciones(api_key)
		}, 2500)
	}

	componentWillUnmount() {
		clearInterval(this.intervalId)
	}

	renderSincronizaciones() {
		let comp = [];
		let {sincronizaciones} = this.props;
		for(let key in sincronizaciones) {
			comp.push((
				<div className="col">
					<fieldset>
						<h3>{key}</h3> 
						{ sincronizaciones[key].finalizado ?
							<div title={sincronizaciones[key].finalizado}
							className="tiempo">{moment(sincronizaciones[key].finalizado).from(moment())}</div>
							:
							<div>En proceso</div>
						}

					</fieldset>
				</div>
			));
		}

		return (
			<div className="sincronizaciones">
				<div className="container-fluid">
					<div className="row">
						{comp}
					</div>
				</div>
			</div>
		)
	}

	getPorcentaje(catalogo) {
		const sincronizaciones = this.props.sincronizaciones || {}
		let p = Math.round((sincronizaciones[catalogo].sincronizados || 0) * 100 / sincronizaciones[catalogo].total || 0)
		if (p > 100) {
			p = 100
		}
		return p
	}

    render() {
		const {
			sincronizarAlmacenes, 
			sincronizarClientes, 
			sincronizarProductos, 
			configuracion
		} = this.props;
		const sincronizaciones = this.props.sincronizaciones || {}
        return (
        	<div className="container-fluid">
        		<TituloComponent texto="Sincronizaciones"></TituloComponent>

	            <div className="row">

	            	<div className="col-md-6">
	            		<h2 className="text-center upper text-muted"><i className="ion-android-download"></i></h2>
			            { Boolean(sincronizaciones.almacenes) &&
			            	<div className="sincronizacionItem">
			            		<h4 className="text-primary mb-1">{configuracion.inventario.palabra_almacenes } y Configuraciones</h4>
			            		<div className="text-muted" title={moment(sincronizaciones.almacenes.finalizado).format('DD/MM/YY HH:mm:ss')}>
			            			<i className="ion-clock"></i> Sincronizado {moment(sincronizaciones.almacenes.finalizado).from(moment())}
			            		</div>
					            { Boolean(!sincronizaciones.almacenes.en_proceso) ?
					            	<div>
					            		<button className="btn btn-sm btn-info" onClick={() => sincronizarAlmacenes(this.props.api_key)}>
							            	Sincronizar
							            </button>
						            </div>
						            :
						            <div>
							            <button className="btn btn-sm btn-info" disabled>
							            	Sincronizando {this.getPorcentaje('almacenes')}%
							            </button>
						            	<button 
						            		title="Cancelar sincronización" 
						            		className="btn btn-sm btn-danger" 
						            		onClick={() => {this.props.cancelarSincronizacion(this.props.api_key, 'almacenes')}}
						            	>
						            		<i className="ion-close"></i>
						            	</button>
				            		</div>
					            }
					            <div className="progress-line" style={{width: `${this.getPorcentaje('almacenes')}%`}}></div>
			            	</div>
			            }

			            { Boolean(sincronizaciones.clientes) &&
			            	<div className="sincronizacionItem">
			            		<h4 className="text-primary mb-1">Clientes</h4>
			            		<div className="text-muted" title={moment(sincronizaciones.clientes.finalizado).format('DD/MM/YY HH:mm:ss')}>
			            			<i className="ion-clock"></i> Sincronizado {moment(sincronizaciones.clientes.finalizado).from(moment())}
			            		</div>
			            		{ Boolean(!sincronizaciones.clientes.en_proceso) ?
			            			<div>
					            		<button className="btn btn-sm btn-info mr-1" onClick={() => sincronizarClientes(this.props.api_key)}>
							            	Sincronizar
							            </button>
							            <button 
							            	title="Forzar descarga de todos los clientes" 
							            	className="btn btn-sm btn-primary" 
							            	onClick={() => sincronizarClientes(this.props.api_key, true)}
							            	>
							            	Forzar Descarga
							            </button>
						            </div>
						            :
						            <div>
							            <button className="btn btn-sm btn-info" disabled>
							            	Sincronizando {this.getPorcentaje('clientes')}%
							            </button>
						            	<button 
						            		title="Cancelar sincronización" 
						            		className="btn btn-sm btn-danger" 
						            		onClick={() => {this.props.cancelarSincronizacion(this.props.api_key, 'clientes')}}
						            	>
						            		<i className="ion-close"></i>
						            	</button>
				            		</div>
					            }
					            <div className="progress-line" style={{width: `${this.getPorcentaje('clientes')}%`}}></div>
			            	</div>
			            }

			            { (this.props.almacen && this.props.almacen.id) &&
		            		<div>
		            		{ Boolean(sincronizaciones.productos) &&
				            	<div className="sincronizacionItem">
				            		<h4 className="text-primary mb-1">Productos</h4>
				            		<div className="text-muted" title={moment(sincronizaciones.productos.finalizado).format('DD/MM/YY HH:mm:ss')}>
				            			<i className="ion-clock"></i> Sincronizado {moment(sincronizaciones.productos.finalizado).from(moment())}
				            		</div>
				            		{ Boolean(!sincronizaciones.productos.en_proceso) ?
				            			<div>
						            		<button className="btn btn-sm btn-info mr-1" onClick={() => sincronizarProductos(this.props.api_key, this.props.almacen.id)}>
								            	Sincronizar
								            </button>
				            				<button 
								            	title="Forzar descarga de todos los productos" 
								            	className="btn btn-sm btn-primary" 
								            	onClick={() => sincronizarProductos(this.props.api_key, this.props.almacen.id, true)}
								            	>
								            	Forzar Descarga
								            </button>
				            			</div>
							            :
							            <div>
								            <button className="btn btn-sm btn-info" disabled>
								            	Sincronizando {this.getPorcentaje('productos')}%
								            </button>
							            	<button 
							            		title="Cancelar sincronización" 
							            		className="btn btn-sm btn-danger" 
							            		onClick={() => {this.props.cancelarSincronizacion(this.props.api_key, 'productos')}}
							            	>
							            		<i className="ion-close"></i>
							            	</button>
					            		</div>
						            }
						            <div className="progress-line" style={{width: `${this.getPorcentaje('productos')}%`}}></div>
				            	</div>
				            }
				            </div>
				        }

	            	</div>

	            	<div className="col-md-6">
	            		<h2 className="text-center upper text-muted"><i className="ion-android-upload"></i></h2>
	            		<div className="sincronizacionItem">
	            			<h4 className="text-primary mb-1">Ventas</h4>
		            		<button disabled={!sincronizaciones.ventas.habilitado} onClick={(e) => {this.props.sincronizarVentas(this.props.api_key)}} className="btn btn-sm btn-info">Sincronizar</button>
	            		</div>

	            		<div className="sincronizacionItem">
	            			<h4 className="text-primary mb-1">Retiros de Efectivo</h4>
		            		<button disabled={!sincronizaciones.retirosEfectivo.habilitado} onClick={(e) => {this.props.sincronizarRetiros(this.props.api_key)}} className="btn btn-sm btn-info">Sincronizar</button>
	            		</div>

	            		<div className="sincronizacionItem">
	            			<h4 className="text-primary mb-1">Recepciones de Pago</h4>
		            		<button disabled={!sincronizaciones.recepcionesPago.habilitado} onClick={(e) => {this.props.sincronizarRecepcionesPago(this.props.api_key)}} className="btn btn-sm btn-info">Sincronizar</button>
	            		</div>

	            	</div>

		            {/*<div className="col">
			            <button className="btn btn-primary">
			            	Sincronizar Configuraciones
			            </button>
		            </div>*/}
	            </div>
            </div>
        );
    }
}


const mapStateToProps = state => ({
    ...state.app,
    almacen: state.app.configuracion.almacen
});

const mapDispatchToProps = dispatch => bindActionCreators({
	sincronizarAlmacenes, 
	sincronizarClientes, 
	obtenerSincronizaciones, 
	cancelarSincronizacion, 
	sincronizarVentas,
	sincronizarRecepcionesPago,
	sincronizarRetiros,
	sincronizarProductos
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Sincronizaciones);