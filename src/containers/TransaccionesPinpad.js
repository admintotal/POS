import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as Api from '../api';
import {cargando, mensajeFlash} from '../actions';
import formatCurrency from 'format-currency';
import TituloComponent from '../components/TituloComponent';
import NoResultsComponent from '../components/NoResultsComponent';
import moment from 'moment';

class TransaccionesPinpad extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            ...props
        }
    }

    obtenerTransaccionesPinpad() {
        this.props.cargando()
        Api.obtenerTransaccionesPinpad(this.props.api_key)
        .then((res)  => {
            this.setState({transacciones: res.objects})
            this.props.cargando(false)
        })
        .catch((err) => {
            this.props.mensajeFlash('error', err)
            this.props.cargando(false)
        })
    }

    componentDidMount() {
        this.obtenerTransaccionesPinpad()
    }

    render() {
        let transacciones = this.state.transacciones || []
        return (
            <div className="container-fluid">
                <TituloComponent texto={`Transacciones Pinpad ${moment().format('DD/MM/YYYY')}`}></TituloComponent>
            	<div className="row">
            		<div className="col-md-12">

                        { Boolean(transacciones.length) ?
                        <div>
                            <div className="table-responsive">
                    			<table className="table table-condensed vm table-list table-hover table-list">
                    				<thead>
                    					<tr>
                                            <th>Fecha</th>
                                            <th>Status</th>
                    						<th>Usuario</th>
                    						<th>Referencia</th>
                    						<th className="text-right">Importe</th>
                    					</tr>
                    				</thead>
                                    <tbody>
                                        { transacciones.map((transaccion) => {
                                            return (
                                                <tr key={`trans-${transaccion.autorizacion}`}>
                                                    <td>{transaccion.fecha}</td>
                                                    <td>{transaccion.status}</td>
                                                    <td>{transaccion.usuario}</td>
                                                    <td>{transaccion.referencia}</td>
                                                    <td className="text-right font-weight-bold">${formatCurrency(transaccion.importe)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                    			</table>
                            </div>
                        </div>
                        :
                        <NoResultsComponent msg="No hay transacciones para mostrar."></NoResultsComponent>
                        }
            		</div>
            	</div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
	...state.app,
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({mensajeFlash, cargando}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TransaccionesPinpad);