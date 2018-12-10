import React from 'react';
import formatCurrency from 'format-currency';
import moment from 'moment';
import { connect } from 'react-redux';
import TituloComponent from '../components/TituloComponent';
import * as Api from '../api';
import loading from '../assets/loading.gif';
import Paginador from '../components/PaginadorComponent';

moment.locale('es')

class Home extends React.Component {
	constructor(props) {
		super(props)
		this.state = {cargando: {}}
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

	onPageChange(data, prefijo) {
		let dashboard = {...this.state.dashboard}
		dashboard[prefijo] = data.data[prefijo]

		this.setState({
			...this.state,
			dashboard: {...dashboard}
		})
	}

	obtenerSesionCajaDetalles(id) {
		this.props.history.push({
			pathname: `/reportes/sesion-caja/${id}`
		})
	}


	componentDidMount() {
		if (this.props.api_key) {
			this.setState({
				cargando: {
					...this.state.cargando,
					sesionesCaja: true
				}
			})

			Api.getDashboard(this.props.api_key).then((resp) => {
				this.setState({
					dashboard: resp.data,
					cargando: {
						...this.state.cargando,
						sesionesCaja: false
					}
				})
			}).catch(e => {
				console.error(e)
			})
		}
	}

    render() {
        return (
            <div>
            	{ this.props.configuracion.general && 
            	 <TituloComponent texto={this.props.configuracion.general.nombre_empresa}></TituloComponent>
            	}
				
            	<div className="container-fluid">
					<div className="row">
						<div className="col">
							<h5 className="text-primary">Sesiones de caja</h5>
							<fieldset>
								{this.state.cargando.sesionesCaja &&
									<div className="text-center"><img alt="Cargando" src={loading} /></div>
								}
								{ this.state.dashboard &&
									<div>
										<div className="table-responsive">
											<table className="table table-condensed vm table-list table-hover table-list table-striped clickeable">
												<thead>
													<tr>
														<th>Cajero</th>
														<th>Inicio</th>
														<th>Fin</th>
														<th className="text-right">Ventas</th>
													</tr>
												</thead>
												<tbody>
													{this.state.dashboard.sesionesCaja.items.map(sc => {
														return <tr key={`sc-${sc._id}`} onClick={this.obtenerSesionCajaDetalles.bind(this, sc._id)}>
															<td>{sc.cajero.username}</td>
															<td>
																{moment(sc.inicio.fecha).format('DD/MM/YY HH:mm')} - <b>${formatCurrency(sc.inicio.totalFondo)}</b>
															</td>
															<td>
															{ sc.fin && 
																<span>
																	{moment(sc.fin.fecha).format('DD/MM/YY HH:mm')} - <b>${formatCurrency(sc.fin.totalFondo)}</b>
																</span>
															}
															</td>
															<td 
																className={'text-right ' + (sc.totalVentasSinc === sc.totalVentas ? "text-success" : "text-danger")}>
																<div>
																	<div style={{lineHeight: 1}}>{sc.totalVentas} </div>
																	{ !Boolean(sc.totalVentasSinc === sc.totalVentas) &&
																		<a title="Enviar ventas">
																			<small className="text-danger">({sc.totalVentas - sc.totalVentasSinc} no sincronizadas)</small>
																		</a>
																	}
																</div>
															</td>
														</tr>
													})}
												</tbody>
											</table>
										</div>
										{ Boolean(this.state.dashboard.sesionesCaja) &&
										<div className="text-right">
											<Paginador
												relative={true}
												prefijo="sesionesCaja"
					                            paginas={this.state.dashboard.sesionesCaja.paginador.paginas}
					                            onResult={this.onPageChange.bind(this)}
					                            paginaActual={this.state.dashboard.sesionesCaja.paginador.pagina}
					                        ></Paginador>
										</div>
										}
									</div>
								}
							</fieldset>
						</div>
					</div>
				</div>
			</div>
        );
    }
}

const mapStateToProps = state => ({
    ...state.app
});


export default connect(
  mapStateToProps,
)(Home);

