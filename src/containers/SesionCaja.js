import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {cerrarCaja, guardarSesionCaja} from '../actions/puntoVentaActions';
import FondoCajaComponent from '../components/FondoCajaComponent';
import { mostrarAlerta } from '../actions';
import formatCurrency from 'format-currency';

class SesionCaja extends React.Component {
	
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
    api_key: state.app.api_key
});


const mapDispatchToProps = dispatch => bindActionCreators({
	cerrarCaja,
	guardarSesionCaja,
	mostrarAlerta
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(SesionCaja);