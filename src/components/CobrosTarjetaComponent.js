import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { getNumeroTarjeta } from '../helpers.js';
import { Link } from 'react-router-dom';
import InputNumber from 'rc-input-number';
import '../../node_modules/rc-input-number/assets/index.css';
import formatCurrency from 'format-currency';

class CobrosTarjetaComponent extends React.Component {

	constructor(props) {
		super(props)
		this.state = {
			monto: props.cobroMax || 0
		}
	}

	componentDidMount() {
		if (this.montoInput) {
			this.montoInput.input.select()
		}
	}

	getCobro() {
		return {
			monto: this.state.monto
		}
	}

	async consultarDatosTarjeta() {
		if (this.consultarBtn) {
			this.consultarBtn.disabled = true
		}

		if (this.props.onConsultarDatos) {
			await this.props.onConsultarDatos(this.getCobro())
		}
		
		if (this.consultarBtn) {
			this.consultarBtn.disabled = false
		}
	}

	async cobrar() {
		if (this.cobrarBtn) {
			this.cobrarBtn.disabled = true
		}

		await this.props.onCobrar(this.getCobro())

		if (this.cobrarBtn) {
			this.cobrarBtn.disabled = false
		}
	}

	cancelarOperacion() {
		if (this.cobrarBtn) {
			this.cobrarBtn.disabled = true
		}

		if (this.props.onCancelarOperacion) {
			this.props.onCancelarOperacion()
		}
	}

    render() {
    	let infoTarjeta = this.props.infoTarjeta
    	let cobros = this.props.cobros || []

        return (
            <div className="dialog-box">
            	{ Boolean(!infoTarjeta) &&
            	<div style={{position: 'absolute', right: '5px', top: '5px'}}>
            		<button title="Cerrar" onClick={this.props.onClose} className="btn btn-link text-danger">
						<i className="ion-close"></i>
					</button>
            	</div>
            	}
            	
            	<div className="mb-2">
					<div className="text-primary text-center h4">Pago con Tarjeta</div>
					<p className="text-info text-center m-0">El restante a pagar es: <b>${formatCurrency(this.props.cobroMax)}</b></p>
					{ this.props.modoPruebas &&
						<div className="alert alert-danger mt-2 p-2">
                            <i className="ion-alert-circled"></i> Los pagos con tarjeta están en modo de pruebas, ingrese a <Link className="text-danger" to="/configuracion">configuración</Link> para cambiar esta opción.
                        </div>
					}
				</div>

				{ Boolean(cobros.length) &&
				<div className="table-responsive" style={{maxHeight: '150px', overflow: 'auto'}}>
					<table className="table table-sm table-striped vm">
						<thead>
							<tr>
								<th>Aut</th>
								<th>Tarjeta</th>
								<th>Tarjetahabiente</th>
								<th className="text-right">Importe</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
						{ cobros.map((c, i) => {
							return (
							<tr key={`ct-${i}`}>
								<td>{c.datos.autorizacion}</td>
								<td>
									#{getNumeroTarjeta(c.datos.noTarjeta)} {Boolean(c.datos.al) && <small class="text-muted text-lowercase">({c.datos.al})</small>}
								</td>
								<td>{c.datos.tarjetahabiente}</td>
								<td className="text-right">
									${formatCurrency(c.importe)}
								</td>
								<td className="text-right">
									{<i className="ion-checkmark-round text-success"></i>}
								</td>
							</tr>
							)
						})}
						</tbody>
					</table>
				</div>
				}

				{ infoTarjeta &&
					<div className="alert alert-sm alert-info">
						{Boolean((infoTarjeta.tarjetahabiente || '')) &&
						<div>Tarjetahabiente: <b>{infoTarjeta.tarjetahabiente}</b></div>
						}
						<div>Tarjeta: <b>{infoTarjeta.tarjeta} ({infoTarjeta.tipoTarjeta})</b> Exp: <b>{infoTarjeta.mesExp}/{infoTarjeta.anioExp}</b></div>
						<div>Cargo a realizar: <b>${formatCurrency(infoTarjeta.importe)}</b></div>
					</div>
				}

				<table className="table vm">
					<tr>
						<td></td>
						<td>
							<InputNumber
	                          autoFocus
	                          style={{ width: '100%' }}
	                          disabled={infoTarjeta ?  true : false}
	                          ref={(input) => {this.montoInput = input}}
	                          value={this.state.monto}
	                          max={this.props.cobroMax}
	                          onChange={(value) => {
	                                if (+value < 0) {
	                                    value = 1
	                                }

	                                this.setState({monto: value})
	                            }}
	                        />
						</td>
						<td className="text-right">
							{ (this.props.integracion === "santander") ?
								<div>
								{ infoTarjeta ?
									<div>
										<button 
											onClick={this.cobrar.bind(this)}
											ref={(btn) => {this.cobrarBtn = btn}} 
											className="btn btn-success mr-1">
											Realizar Cargo
										</button>
										<button 
											title="Cancelar operación"
											onClick={this.cancelarOperacion.bind(this)} 
											ref={(btn) => {this.cancelarBtn = btn}} 
											className="btn btn-danger">
											<i className="ion-close"></i>
										</button>
									</div>
									:
									<button 
										onClick={this.consultarDatosTarjeta.bind(this)} 
										ref={(btn) => {this.consultarBtn = btn}} 
										className="btn btn-primary">
										Consultar Tarjeta
									</button>
								}	
								</div>
								:
								<button 
									onClick={this.cobrar.bind(this)}
									ref={(btn) => {this.cobrarBtn = btn}} 
									className="btn btn-success mr-1">
									Realizar Cargo
								</button>
							}
						</td>
					</tr>
				</table>

            </div>
        );
    }
}

const mapStateToProps = state => ({
	
});

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(CobrosTarjetaComponent);