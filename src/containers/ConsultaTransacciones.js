import React from 'react';
import formatCurrency from 'format-currency';
import moment from 'moment';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import TituloComponent from '../components/TituloComponent';
import * as Api from '../api';
import { 
    cargando,
    mensajeFlash,
    mostrarAlerta
} from '../actions';
import InputNumber from 'rc-input-number';
import IngresoAutorizacionComponent from '../components/IngresoAutorizacionComponent';
import * as Impresora from '../impresoras';
import {getNumeroTarjeta} from '../helpers';

moment.locale('es')

class ConsultaTransacciones extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
            referencia: '',
            transaccion: null,
            modalDevolucion: null,
            autorizadoConfiguracion: props.usuario.autorizaciones.guardar_configuracion_desktop,
        }
	}

	componentDidMount() {
        if (this.referencia_input) {
            this.referencia_input.focus()
        }
	}

    onValidarAutorizacion() {

    }

	async consultar() {

        if (!this.state.referencia || this.state.referencia === '') {
            return this.props.mostrarAlerta({
                titulo: 'Error de validación',
                mensaje: 'Especifique una referencia válida.'
            })
        }

        this.props.cargando()
        try {
            let consulta = await Api.consultarTransaccionPinpad(this.props.api_key, this.state.referencia)
            if (consulta.status === 'success') {
                this.setState({
                    referencia: '',
                    transaccion: consulta.datos,
                    transaccionesRelacionadas: consulta.transacciones || []
                })
            } else {
                this.setState({
                    transaccion: null
                })
                this.props.mostrarAlerta({
                    titulo: 'Hubo un error al realizar la consulta',
                    mensaje: consulta.mensaje
                })
            }
            this.props.cargando(false)
        } catch(e) {
            console.error(e)
            this.props.mostrarAlerta({
                titulo: 'Hubo un problema en la consulta',
                mensaje: e.messaje
            })
            this.props.cargando(false)
        }
    }

    async solicitar(solicitud) {
        if (!this.state.transaccion) {
            return this.props.mostrarAlerta({
                titulo: 'Error de validación',
                mensaje: 'No se ha especificado ninguna transacción.'
            })
        }

        this.props.cargando()
        try {
            let transaccion = this.state.transaccion
            let titulo 
            let data = {
                referencia: transaccion.referencia, 
                solicitud: solicitud
            }

            switch(solicitud) {
                case 'devolucion':
                    data['monto'] = this.state.modalDevolucion.monto
                    break

                case 'cancelacion':
                    data['monto'] = transaccion.importe
                    break

                default:
                    break;
            }
            
            let consulta = await Api.solicitudTransaccionPinpad(this.props.api_key, data)

            if (consulta.status === 'success') {
                Impresora.imprimirVoucherTransaccion(consulta.instance._id, this.props.api_key, 'cliente')
                Impresora.imprimirVoucherTransaccion(consulta.instance._id, this.props.api_key, 'comercio')
            } else {
                titulo = 'Hubo un error al realizar su solicitud'
            }
            
            this.setState({
                transaccionesRelacionadas: consulta.transacciones || []
            })

            this.props.mostrarAlerta({
                titulo: titulo,
                mensaje: consulta.mensaje
            })

            this.props.cargando(false)

        } catch(e) {
            this.props.mostrarAlerta({
                titulo: 'Hubo un error al realizar su solicitud',
                mensaje: e.messaje
            })

            this.props.cargando(false)
        }
    }

    render() {
        let autorizadoConfiguracion = true // this.state.autorizadoConfiguracion
        let transaccion = this.state.transaccion
        let tiposTransacciones = {
            cancelacion: 'Cancelación',
            devolucion: 'Devolución',
            venta: 'Venta',
        }

        if (! autorizadoConfiguracion) {
            return (
                <IngresoAutorizacionComponent 
                    titulo="Requiere de autorización para recepciones de pago."
                    api_key={this.props.api_key} 
                    nombreAutorizacion='guardar_configuracion_desktop' 
                    onValidar={this.onValidarAutorizacion.bind(this)}>
                </IngresoAutorizacionComponent>
            )
        }
    
        return (
            <div className="ConsultarTransacciones">
                { this.props.configuracion.general && 
                 <TituloComponent texto="Consultar Transacción Pinpad"></TituloComponent>
                }
                
            	<div className="container-fluid">
                    <div className="row">
                        <div className="col-md-5">
                            <fieldset>
                                <div className="form-group">
                                    <label htmlFor="">Referencia:</label>
                                    <input 
                                        ref={(input) => {this.referencia_input = input}}
                                        onChange={(e) => {
                                            this.setState({
                                                referencia: e.target.value.trim()
                                            })
                                        }} 
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                this.consultar()
                                            }
                                        }}
                                        value={this.state.referencia} 
                                        type="text" 
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group mt-2">
                                    <button className="btn btn-primary" onClick={this.consultar.bind(this)}>Consultar</button>
                                </div>
                            </fieldset>

                            {Boolean(transaccion && this.state.transaccionesRelacionadas.length) &&
                                <div>
                                    {this.state.transaccionesRelacionadas.map(t => {
                                        return (
                                        <fieldset className={`p-1 pl-2 card-trans trans-${t.resultado.status}`}>
                                            <div><b>{(t.tipoTransaccion in tiposTransacciones) ? tiposTransacciones[t.tipoTransaccion] : t.tipoTransaccion}</b></div>
                                            { Boolean(t.resultado.datos && t.resultado.datos.referencia) && 
                                            <div>Ref: {t.resultado.datos.referencia}</div>
                                            }
                                            { Boolean(t.resultado.datos && t.resultado.datos.numeroControl) && 
                                            <div>No. Control: {t.resultado.datos.numeroControl}</div>
                                            }
                                            <div>Mensaje: {t.resultado.mensaje}</div>
                                            <div>Solicitado: {moment(t.fecha).format('DD/MM/YYYY HH:mm')}</div>
                                            {(t.resultado.status === 'success') &&
                                            <div className="text-right">
                                                <button className="btn btn-light btn-sm" title="Imprimir" onClick={(e) => {
                                                    Impresora.imprimirVoucherTransaccion(t._id, this.props.api_key, 'cliente')
                                                    Impresora.imprimirVoucherTransaccion(t._id, this.props.api_key, 'comercio')
                                                }}>
                                                    <i className="ion-printer"></i>
                                                </button>
                                            </div>
                                            }
                                        </fieldset>
                                        )
                                    })}
                                </div>
                            }
                        </div>
                        <div className="col-md-7">
                            { transaccion &&
                                <div>
                                    <fieldset>
                                        <h4 className="text-primary mb-0">{transaccion.tipoTransaccion} </h4>
                                        <div><span className="badge badge-info" title="Status">{transaccion.resultadoTransaccion}</span></div>
                                        <div className="border-bottom">
                                            <div className="row">
                                                <div className="col">
                                                    <div  className="upper text-muted"><small>Referencia:</small></div>
                                                    <h5 className="text-primary">{transaccion.referencia}</h5>
                                                </div>
                                                <div className="col">
                                                    <div  className="upper text-muted"><small>Tarjeta:</small></div>
                                                    <h5 className="text-primary">{getNumeroTarjeta(transaccion.noTarjeta)}</h5>
                                                </div>
                                                <div className="col">
                                                    <div className="upper text-right text-muted"><small>Importe:</small></div>
                                                    <h5 className="text-primary text-right">${formatCurrency(transaccion.importe)}</h5>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col">
                                                <div><small className="upper text-muted">Inicio:</small></div>
                                                <div>{moment(transaccion.fechaHora).format('DD/MM/YYYY HH:mm')}</div>
                                            </div>
                                            <div className="col">
                                                <div><small className="upper text-muted">Fin:</small></div>
                                                <div>{moment(transaccion.fechaHoraSalida).format('DD/MM/YYYY HH:mm')}</div>
                                            </div>
                                        </div>

                                        <div className="mt-2 p-1 alert alert-info text-center"><small>{transaccion.status}</small></div>
                                    </fieldset>
                                    <div className="text-right">
                                        <button onClick={this.solicitar.bind(this, 'cancelacion')} className="btn btn-danger mr-2">Cancelar Transacción</button>
                                        <button onClick={(e) => {
                                            this.setState({
                                                modalDevolucion: {
                                                    ...this.state.modalDevolucion,
                                                    monto: 0
                                                }
                                            })
                                        }} className="btn btn-primary">Solicitar Devolución</button>
                                    </div>
                                </div>
                            }
                        </div>
                    </div>
				</div>


                { this.state.modalDevolucion &&
                <div className="dialog-box modalAutorizacion">
                    <div className="text-primary text-center h5">Solicitar Devolución</div>
                    <div className="text-info text-center text-bold">Ingrese el monto de la devolución.</div>
                    <div className="form-group">
                        <label htmlFor="">Monto:</label>
                        <InputNumber 
                            autoFocus
                            min={0}
                            value={this.state.modalDevolucion.monto}
                            onChange={(e) => {
                                this.setState({
                                    modalDevolucion: {
                                        ...this.state.modalDevolucion,
                                        monto: e
                                    }
                                })
                            }} 
                        />
                    </div>
                    <div className="form-group text-right mt-2 border-top pt-2">
                        <button className="btn btn-default mr-2" onClick={(e) => {this.setState({modalDevolucion: null})}}>Cerrar</button>
                        <button className="btn btn-primary" onClick={this.solicitar.bind(this, 'devolucion')}>Solicitar</button>
                    </div>
			     </div>
                }

            </div>
        );
    }
}

const mapStateToProps = state => ({
    ...state.app,
    configuracion: state.app.configuracion,
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({
    cargando,
    mensajeFlash,
    mostrarAlerta
}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ConsultaTransacciones);

