import React from 'react';
import formatCurrency from 'format-currency';
import moment from 'moment';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as Api from '../api';
import {
    cargando, 
    mensajeFlash, 
    mostrarAlerta, 
    verRecepcionPago, 
    sincronizarRecepcionesPago
} from '../actions';
import * as Impresora from '../impresoras';
import TituloComponent from '../components/TituloComponent';
import Paginador from '../components/PaginadorComponent';
import NoResultsComponent from '../components/NoResultsComponent';
import IngresoAutorizacionComponent from '../components/IngresoAutorizacionComponent';
import { Link } from 'react-router-dom';
import ReactDatetime from 'react-datetime';
import '../../node_modules/react-datetime/css/react-datetime.css';

class RecepcionesPago extends React.Component {
	constructor(props) {
		super(props)
        
		this.state = {
            paginador: {},
            filtro: {
                usuario: props.usuario.id,
                status: '',
                folio: '',
                desde: moment().startOf('day'),
                hasta: moment().endOf('day'),
                elemPorPag: 50,
            },
            habilitarSinc: true,
            autorizadoListado: props.usuario.autorizaciones.recepciones_pago || false
        }
	}

	componentDidMount() {
        this.obtenerRecepcionesPago()
	}

    obtenerRecepcionesPago() {
        this.props.cargando()
        Api.obtenerRecepcionesPago(this.props.api_key, {...this.state.filtro}, true)
        .then((res)  => {
            this.setState({
                objects: res.objects, 
                paginador: res.paginador
            })
            this.props.cargando(false)
        })
        .catch((err) => {
            this.props.mensajeFlash('error', err)
            this.props.cargando(false)
        })
    }

    changeFiltro(campo, v) {
        
        if (v === this.state.filtro[campo]) {
            return
        }

        // validación fecha
        if (['desde', 'hasta'].indexOf(campo) > -1) {
            if (typeof v === "string") {
                return 
            }
        }

        this.setState({
            filtro: {
                ...this.state.filtro,
                [campo]: v
            }
        })

        setTimeout(() => {
            this.obtenerRecepcionesPago()
        }, 300)
    }

    onPageChange(resp) {
        if (resp.status === 'success') {
            this.setState({
                ventas: resp.objects,
                paginador: resp.paginador
            })
        } else {
            console.log(resp)
        }
    }

    onValidarAutorizacion(valido) {
        this.setState({
            autorizadoListado: valido
        })

        if (!valido) {
            this.props.mensajeFlash('error', 'La clave ingresada es incorrecta.')
        }
    }

    handleImprimir(o) {
        let conf = {}
        if (this.props.configuracion.impresora) {
            conf.marginLeft = this.props.configuracion.impresora.marginLeft;
            conf.paperWidth = this.props.configuracion.impresora.paperWidth;
        }

        Impresora.imprimirReciboPago(o._id, this.props.api_key)
    }

    verRecepcionPago(recepcionPago) {
        this.props.verRecepcionPago(
            recepcionPago, 
            {
                onSincronizar: () => {
                    this.obtenerRecepcionesPago()
                }
            }
        )
    }

    async sincronizar() {
        if (this.btnSincronizar) {
            this.btnSincronizar.disabled = true
        }

        try {
            await this.props.sincronizarRecepcionesPago(this.props.api_key)
            this.obtenerRecepcionesPago()
        } catch (e) {
            console.error(e)
        }

        if (this.btnSincronizar) {
            this.btnSincronizar.disabled = false
        }
    }

    render() {
        let objects = this.state.objects || []
        let autorizadoListado = this.state.autorizadoListado

        if (! autorizadoListado) {
            return (
                <IngresoAutorizacionComponent 
                    nombreAutorizacion='recepciones_pago'
                    api_key={this.props.api_key} 
                    onValidar={this.onValidarAutorizacion.bind(this)}>
                </IngresoAutorizacionComponent>
            )
        }
        
        return (
            <div className="container-fluid" ref={(comp) => {this.componente = comp }}>
            	<TituloComponent texto="Recepciones de Pago"></TituloComponent>

                <div className="text-right">
                    <button 
                        ref={(btn) => {this.btnSincronizar = btn}}
                        onClick={this.sincronizar.bind(this)} 
                        className="btn btn-info mr-1">
                        Sincronizar
                    </button>
                    <Link to="/recepcion-pago" className="btn btn-primary">
                        Nueva Recepción de Pago
                    </Link>
                </div>
                
                <div className="row">
                    <div className="col">
                        <div className="form-group">
                            <label htmlFor="">Status:</label>
                            <select className="form-control" 
                                value={this.state.filtro.status}
                                onChange={(e) => {this.changeFiltro('status', e.target.value)}}
                            >
                                <option value="">Todas</option>
                                <option value="sincronizadas">Sincronizadas</option>
                                <option value="error">Con Error</option>
                            </select>
                        </div>
                    </div>
                    <div className="col">
                        <div className="form-group">
                        <label htmlFor="">Desde:</label>
                            <ReactDatetime
                                ref={(picker) => {this.pickerDesde = picker }}
                                isValidDate={(current) => {
                                    let valid = current.isBefore(moment())
                                    return valid
                                }}
                                value={this.state.filtro.desde}
                                inputProps={{
                                    className:"form-control",
                                    onBlur: () => {
                                        setTimeout(() => this.pickerDesde.closeCalendar(), 550)
                                    }
                                }}
                                onChange={(d) => {this.changeFiltro('desde', d)}}
                             />
                        </div>
                    </div>
                    <div className="col">
                        <div className="form-group">
                        <label htmlFor="">Hasta:</label>
                            <ReactDatetime
                                ref={(picker) => {this.pickerHasta = picker }}
                                isValidDate={(current) => {
                                    let valid = current.isBefore(moment())
                                    return valid
                                }}
                                value={this.state.filtro.hasta}
                                inputProps={{
                                    className:"form-control",
                                    onBlur: () => {
                                        setTimeout(() => this.pickerHasta.closeCalendar(), 550)
                                    }
                                }}
                                onChange={(d) => {this.changeFiltro('hasta', d)}}
                             />
                        </div>
                    </div>

                    <div className="col">
                        <div className="form-group">
                        <label htmlFor="">Texto:</label>
                            <input type="text" className="form-control" 
                                onBlur={(e) => {this.changeFiltro('q', (e.target.value || '').trim())}} />
                        </div>
                    </div>

                    <div className="col">
                        <div className="form-group">
                        <label htmlFor="">Por pág:</label>
                            <select className="form-control" 
                                value={this.state.filtro.elemPorPag}
                                onChange={(e) => {this.changeFiltro('elemPorPag', e.target.value)}} >
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="200">200</option>
                            </select>
                        </div>
                    </div>
                </div>

            	{ Boolean(objects.length) ?
                    <div>
                    	<table className="table table-condensed vm table-list table-hover table-list clickeable">
                    		<thead>
                    			<tr>
                                    <th>Sinc.</th>
                                    <th style={{width: '215px'}}>Referencia</th>
                    				<th>Fecha</th>
                                    <th>Cliente</th>
                                    <th className="text-right">Importe</th>
                                    <th className="text-right">Aplicado</th>
                                    <th style={{width: '90px'}}></th>
                    			</tr>
                    		</thead>
                    		<tbody>
                    			{ objects.map((rp) => {
                    				return (
                                    <tr>
                                        <td onClick={e => { this.verRecepcionPago(rp) }}>
                                            {rp.sincronizado ?
                                            <span className="badge badge-success">Si</span> :
                                            <span className="badge badge-default">Pendiente</span>
                                            }
                                        </td>
                                        <td onClick={e => { this.verRecepcionPago(rp) }}>{rp.referencia}</td>
                                        <td onClick={e => { this.verRecepcionPago(rp) }}>{moment(rp.fecha).format('DD/MM/YYYY HH:mm')}</td>
                                        <td onClick={e => { this.verRecepcionPago(rp) }}>{rp.cliente.razon_social}</td>
                                        <td onClick={e => { this.verRecepcionPago(rp) }} className="text-right">${formatCurrency(rp.importe)}</td>
                                        <td onClick={e => { this.verRecepcionPago(rp) }} className="text-right">${formatCurrency(rp.totalAplicado)}</td>
                                        <td className="text-right">
                                            <button 
                                                onClick={this.handleImprimir.bind(this, rp)} 
                                                title="Imprimir" 
                                                className="btn btn-sm btn-secondary" >
                                                <i className="ion-printer"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    )
                    			})}
                    		</tbody>
                    	</table>
                        
                        <Paginador
                            paginas={this.state.paginador.paginas}
                            onResult={this.onPageChange.bind(this)}
                            paginaActual={this.state.paginador.pagina}
                        ></Paginador>
                    </div>
                :
                <NoResultsComponent msg="No hay recepciones de pago capturadas."></NoResultsComponent>
            	}
            </div>
        );
    }
}

const mapStateToProps = state => ({
    ...state.app,
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({
    cargando,
    mensajeFlash,
    verRecepcionPago,
    mostrarAlerta,
    sincronizarRecepcionesPago
}, dispatch);

export default connect(
	mapStateToProps,
    mapDispatchToProps
)(RecepcionesPago);