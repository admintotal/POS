import React from 'react';
import PuntoVentaComponent from '../components/PuntoVenta';
import SesionCajaComponent from './SesionCaja';
import { connect } from 'react-redux';

import './PuntoVenta.css';

class PuntoVenta extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			...props,
			cantidad: 1,
			modalUmProducto: null,
			guardar: {
				habilitado: true,
				texto: 'Guardar'
			}
		}

		this.timeoutId = null
	}

	render() {
		const {sessionCaja} = this.props
		let ventaId = this.props.match ? this.props.match.params.id : null
		return (
			<div className="PuntoVenta">	
				{ sessionCaja ?
					<PuntoVentaComponent ventaId={ventaId} /> :
					<SesionCajaComponent />
				}
			</div>
		)
	}
	
}

const mapStateToProps = state => ({
    sessionCaja: state.puntoVenta.sesionCaja,
})

export default connect(
  mapStateToProps,
)(PuntoVenta)
