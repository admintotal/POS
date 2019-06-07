import React from 'react';
import moment from 'moment';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import TituloComponent from '../components/TituloComponent';
import * as Api from '../api';
import {mensajeFlash, mostrarAlerta} from '../actions';

moment.locale('es')

class CargarRespaldo extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			respaldos: null,
			respaldo: null
		}
	}

	componentDidMount() {
		if (this.props.api_key) {
			Api.obtenerRespaldos(this.props.api_key).then((resp) => {
				console.log(resp.respaldos)
				this.setState({
					respaldos: resp.respaldos
				})
			}).catch(e => {
				console.error(e)
			})
		}
	}

	mostrarRespaldo(respaldo) {
		this.setState({
			respaldo: respaldo
		})
	}

	cargar(archivo) {
		Api.cargarRespaldo(this.props.api_key, {archivo:archivo, fecha: this.state.respaldo.fecha}).then((resp) => {
			if (resp.status === 'success') {
				this.props.mostrarAlerta({mensaje: resp.message})
			}
		}).catch(e => {
			this.props.mostrarAlerta({mensaje: e})
		})
	}

    render() {
        return (
            <div>
            	{ this.props.configuracion.general && 
            	 <TituloComponent texto="Cargar Respaldo"></TituloComponent>
            	}
				
				{this.state.respaldos &&
            	<div className="container-fluid">
					<div className="row">
						<div className="col-md-4">
							<div style={{maxHeight: '90vh', overflow: 'auto'}}>
								<div class="list-group">
									{ Object.values(this.state.respaldos).map(respaldo => {
										return (
									  		<div onClick={this.mostrarRespaldo.bind(this, respaldo)} className="list-group-item clickeable">
									  			{moment(respaldo.fecha).format('DD/MM/YYYY')}
									  		</div>
										)
									})}
								</div>
							</div>
						</div>
						<div className="col-md-8">
							{ Boolean(this.state.respaldo && !this.state.respaldo.archivos.length) &&
								<div className="alert alert-info">No se encontraron respaldos en el día {moment(this.state.respaldo.fecha).format('DD/MM/YYYY')}</div>
							}
							{ Boolean(this.state.respaldo && this.state.respaldo.archivos.length) &&
							<table className="table table-condensed vm table-list table-hover table-list clickeable">
	                    		<thead>
	                    			<tr>
	                    				<th>Nombre</th>
	                    				<th>Fecha</th>
	                                    <th style={{width: '120px'}}></th>
	                    			</tr>
	                    		</thead>
	                    		<tbody>
	                    			{ this.state.respaldo.archivos.map((archivo => {
	                    				return (
	                    					<tr>
	                    						<td>{archivo}</td>
	                    						<td>{moment(this.state.respaldo.fecha).format('DD/MM/YYYY')}</td>
	                    						<td className="text-right">
	                    							<button onClick={this.cargar.bind(this, archivo)} className="btn btn-primary">Cargar</button>
	                    						</td>
	                    					</tr>
	                    				)
	                    			}))}
	                    		</tbody>
	                    	</table>
	                    	}
						</div>
					</div>
				</div>
				}
			</div>
        );
    }
}

const mapStateToProps = state => ({
    ...state.app
});

const mapDispatchToProps = dispatch => bindActionCreators({
    mensajeFlash,
    mostrarAlerta,
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CargarRespaldo);

