import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {retirarEfectivo} from '../actions/puntoVentaActions';
import FondoCajaComponent from '../components/FondoCajaComponent';

class RetirarEfectivo extends React.Component {
	
	retirar(data) {
		this.props.retirarEfectivo(this.props.api_key, data)
		this.props.history.push('/punto-venta')
	}

    render() {
        return (
        	<div className="sesionCaja">
        		<div className="container-fluid">
            		<FondoCajaComponent tipo="retiro" onSubmit={this.retirar.bind(this)} />
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
	retirarEfectivo
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(RetirarEfectivo);