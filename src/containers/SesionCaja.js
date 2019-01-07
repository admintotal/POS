import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {cerrarCaja, guardarSesionCaja} from '../actions/puntoVentaActions';
import FondoCajaComponent from '../components/FondoCajaComponent';
import { mostrarAlerta, cargando, mensajeFlash } from '../actions';
import formatCurrency from 'format-currency';
import * as Api from '../api';

class SesionCaja extends React.Component {

	componentDidMount() {
		if (this.props.sesionCaja) {
			this.props.cargando()
	        Api.obtenerVentas(this.props.api_key, {usuario: this.props.usuario.id, sesion_caja: this.props.sesionCaja._id, status: 'error,pendientes'}, true)
	        .then((res)  => {
	            this.props.cargando(false)
	            if (res.paginador.total) {
					this.props.mostrarAlerta({
						titulo: `Sincronizaciones pendientes`,
						mensaje: `
						<table class="table table-striped table-sm m-0">
							<tbody>
								<tr>
									<td>Ventas</td>
									<td class="text-danger font-weight-bold">${res.paginador.total}</td>
								</tr>
								<tr>
									<td>Retiros de caja</td>
									<td class="text-danger font-weight-bold">${res.retiros.objects.length - res.retiros.sincronizados}</td>
								</tr>
							</tbody>
						</table>
						`,
						cancelable: true,
						cancelarTxt: 'Cerrar',
						aceptarTxt: 'Ver ventas',
						handleAceptar: (e) => {
							this.props.history.push('/mis-ventas?pendientesSinc=1')
						}
					})
	            }
	            
	        })
	        .catch((err) => {
	            this.props.mensajeFlash('error', err)
	            this.props.cargando(false)
	        })
		}
	}
	
	getSesionCierre() {
		return {
			...this.props.sesionCaja
		}
	}

	cerrarCaja(data) {
		let cierre = {
			cajero: data.cajero,
			inicio: this.getSesionCierre(),
			fin: data
		}

		delete cierre.cajero['cortes_caja']
		delete cierre.cajero['sesion_caja']
		delete cierre.cajero['start']

		let props = this.props

		this.props.mostrarAlerta({
            titulo: `Confirme para continuar`,
            mensaje: `¿Desea <b>cerrar caja</b> con el monto de <b>${formatCurrency(data.totalFondo)}</b> ?`,
            cancelable: true,
            handleCancelar: () => {
				
            },
            handleAceptar: () => {
				props.cerrarCaja(props.api_key, cierre)
				props.history.push('/inicio')
            }
        })
		
	}

	abrirCaja(data) {
		this.props.guardarSesionCaja(this.props.api_key, data)
	}

    render() {
        return (
        	<div className="sesionCaja">
        		<div className="container-fluid">
            		<FondoCajaComponent 
            			tipo={this.props.sesionCaja ? 'cerrarCaja' : 'abrirCaja'} 
            			onSubmit={this.props.sesionCaja ? this.cerrarCaja.bind(this): this.abrirCaja.bind(this)} 
            		/>
            	</div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    ...state.puntoVenta,
    configuracion: state.app.configuracion,
    usuario: state.app.usuario,
    api_key: state.app.api_key
});


const mapDispatchToProps = dispatch => bindActionCreators({
	cerrarCaja,
	cargando,
	mensajeFlash,
	guardarSesionCaja,
	mostrarAlerta
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(SesionCaja);