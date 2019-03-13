import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import * as Api from '../api';
import {cargando, mensajeFlash, verVenta} from '../actions';
import formatCurrency from 'format-currency';
import TituloComponent from '../components/TituloComponent';
import NoResultsComponent from '../components/NoResultsComponent';
import moment from 'moment';

class Pedidos extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            ...props,
            habilitarSinc: true
        }
    }

    obtenerPedidos() {
        this.props.cargando()
        Api.obtenerPedidos(this.props.api_key, this.props.usuario.id, 25, true)
        .then((res)  => {
            this.setState({pedidos: res.objects, 'limite': res.limite})
            this.props.cargando(false)
        })
        .catch((err) => {
            this.props.mensajeFlash('error', err)
            this.props.cargando(false)
        })
    }

    sincronizarPedidos() {
        let comp = this
        comp.setState({habilitarSinc: false})
        Api.sincronizarPedidos(this.props.api_key).then((result) => {
            comp.setState({habilitarSinc: true})
            
            if (result.status === 'success') {
                this.obtenerPedidos()
                this.props.mensajeFlash('success', `${result.pedidos.length} pedidos han sido sincronizadas.`)
            } else {
                this.props.mensajeFlash('error', result.data || result.message)
            }
        })
    }

    eliminarPedidos() {
        Api.eliminarRegistros(this.props.api_key, 'pedidos').then((result) => {
            if (result.status === 'success') {
                this.obtenerPedidos()
                this.props.mensajeFlash('success', `${result.totalEliminados} pedidos han sido eliminados.`)
            } else {
                this.props.mensajeFlash('error', result.message || result.data)
            }
        })
    }

    componentDidMount() {
        this.obtenerPedidos()
    }

    render() {
        let pedidos = this.state.pedidos || []
        let almacen = this.props.configuracion.almacen
        
        return (
            <div className="container-fluid">
                <TituloComponent texto="Pedidos"></TituloComponent>
            	<div className="row">
            		<div className="col-md-12">
						
						<div className="text-right mb-2">
                            { Boolean(pedidos.length) &&
                                <span>
                                    {/*
                                        <button className="btn btn-secondary mr-2 float-left" onClick={this.eliminarPedidos.bind(this)}>
                                            Eliminar Pedidos Sincronizados
                                        </button>
                                    */}
                                    <button className="btn btn-info mr-2" onClick={this.sincronizarPedidos.bind(this)} disabled={!this.state.habilitarSinc}>
                                        Sincronizar Pedidos
                                    </button>
                                </span>
                            }
                            { almacen ? 
                             <Link className="btn btn-primary" to="pedido">Agregar Pedido</Link>
                             :
							 <div 
                                className="alert alert-danger text-center clickeable" 
                                title="Ir a la configuración"
                                onClick={(e) => {
                                    this.props.history.push('/configuracion')
                                }}>
                                Es necesario seleccionar un almacén para capturar pedidos.
                             </div>
                            }
						</div>
                        
                        { Boolean(pedidos.length) ?
                        <div>
                            <div className="text-info font-weight-bold"> 
                                Solamente se muestran los últimos {this.state.limite} pedidos.
                            </div>
                            <div className="table-responsive">
                    			<table className="table table-condensed vm table-list table-hover table-list">
                    				<thead>
                    					<tr>
                                            <th>Sinc.</th>
                    						<th>Fecha</th>
                    						<th>Almacén</th>
                    						<th>Cliente</th>
                    						<th className="text-right">Total</th>
                                            <th></th>
                    					</tr>
                    				</thead>
                                    <tbody>
                                        { pedidos.map((pedido) => {
                                            pedido.esPedido = true
                                            return (
                                                <tr key={`pedido-${pedido._id}`}
                                                    // onClick={() => this.props.verVenta(pedido, false)}
                                                >
                                                    <td>
                                                    { pedido.fecha_sincronizacion ?
                                                        <span title={moment(pedido.fecha_sincronizacion).from(moment())} className="badge badge-success">
                                                            Sincronizado
                                                        </span>
                                                        :
                                                        <span className="badge badge-default">Pendiente</span>
                                                    }
                                                    </td>
                                                    <td>{moment(pedido.fecha).format('DD/MM/YYYY HH:mm')}</td>
                                                    <td>{pedido.almacen.nombre}</td>
                                                    <td>{pedido.cliente.razon_social}</td>
                                                    <td className="text-right font-weight-bold">${formatCurrency(pedido.total)}</td>
                                                    <td className="text-right">
                                                        { !Boolean(pedido.fecha_sincronizacion) && 
                                                            <Link className="btn btn-sm btn-info" to={`pedido/${pedido._id}`}>Editar</Link>
                                                        }
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                    			</table>
                            </div>
                        </div>
                        :
                        <NoResultsComponent msg="No hay pedidos capturados."></NoResultsComponent>
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

const mapDispatchToProps = dispatch => bindActionCreators({mensajeFlash, cargando, verVenta}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Pedidos);