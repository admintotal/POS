import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import formatCurrency from 'format-currency';
import moment from 'moment';
import { Link } from 'react-router-dom';
import {cerrarVenta, mensajeFlash, mostrarAlerta} from '../actions';
import { truncate, getNumeroTarjeta, getHoraEntrega } from '../helpers';
import * as Api from '../api';
import * as Impresora from '../impresoras';
import IngresoAutorizacionComponent from '../components/IngresoAutorizacionComponent';

class VentaComponent extends React.Component {
    constructor(props) {
        super(props)
        this.state = {}
    }

    reenviarVenta() {
        let btnText = ''

        if (this.btnReenviar) {
            btnText = this.btnReenviar.innerText
            this.btnReenviar.disabled = true
            this.btnReenviar.innerText = "Reenviando venta..."
        }

        Api.reenviarVenta(this.props.api_key, this.props._id).then(res => {
            if (this.btnReenviar) {
                this.btnReenviar.disabled = false
                this.btnReenviar.innerText = btnText
            }

            this.props.mensajeFlash(res.status, res.message)

            if (this.props.onReenviarVenta) {
                this.props.onReenviarVenta(res)
            }
            
        }).catch(e => {
            console.error(e)
        })
    }

    reimprimirVoucher(tipo, cobroId=null) {
        let usuario = this.props.usuario
        let permiso = 'reimprimir_voucher_pinpad'
        let imprimir = () => {
            Impresora.imprimirVoucher(this.props._id, this.props.api_key, {tipo: tipo, cobroId: cobroId, re: 1})
            .then(() => {

            })
            .catch((err) => {
                this.props.mensajeFlash('error', 'Hubo un error al imprmir el voucher.')

            })
        }

        if (!usuario.superuser && !usuario.permisos[permiso]) {
            return this.setState({
                solicitarAutorizacion: {
                    autorizacion: permiso,
                    onCancelar: () => {
                        this.setState({solicitarAutorizacion: null})
                    },
                    onValidate: (autorizado) => {
                        if (autorizado) {
                            this.setState({solicitarAutorizacion: null})
                            return imprimir()
                        }

                        this.props.mensajeFlash('error', 'Autorización incorrecta.')
                    } 
                }
            })
        }

    }

    sincronizarVenta() {
        let id = this.props._id
        Api.sincronizarVenta(this.props.api_key, id).then((result) => {
            if (result.status === 'error') {
                return this.props.mensajeFlash('error', result.data || result.message)
            }
            
            this.props.mensajeFlash('success', 'La venta ha sido sincronizada correctamente.')

            if (this.props.onSincronizarVenta) {
                this.props.onSincronizarVenta(result)
            }
        })
    }

    render() {
        const venta = this.props
        const solicitarAutorizacion = this.state.solicitarAutorizacion

        if (solicitarAutorizacion) {
            return (
                <IngresoAutorizacionComponent 
                    nombreAutorizacion={solicitarAutorizacion.autorizacion}
                    api_key={this.props.api_key} 
                    onCancelar={this.state.solicitarAutorizacion.onCancelar.bind(this)}
                    onValidar={this.state.solicitarAutorizacion.onValidate.bind(this)}>
                </IngresoAutorizacionComponent>
            )
        }

        return (
            <div className="QuickView VentaComponent">
                <div className="overlay" onClick={e => this.props.cerrarVenta()}></div>
            
                <div className="box">
                    <button onClick={e => this.props.cerrarVenta()} className="cerrar">
                        <i className="ion-close"></i>
                    </button>
                    <div className="text-center">
                        { venta.esPedido ? 
                            <h4 className="text-primary">Ver Pedido</h4>
                            :
                            <h4 className="text-primary">{venta.numero_serie }-{venta.folio}</h4>
                        }
                        <hr className="m1"/>

                        { venta.motivoError &&
                        <small className="alert alert-warning text-center p-1 d-block"><b>Mensaje Admintotal:</b><br/>{venta.motivoError}</small>
                        }

                        <h5 className="mb-0">{venta.cliente.razon_social}</h5>
                        <div className="text-muted">{moment(venta.fecha).format('DD/MM/YYYY HH:mm')}</div>
                        { (venta.sesionCaja && venta.sesionCaja.cajero) &&
                        <div className="text-muted">Capturado por: {venta.sesionCaja.cajero.username} {venta.app_version && <span>| versión {venta.app_version}</span>}</div>
                        }

                        { venta.entregaDomicilio &&
                            <div className="alert alert-info p-1">
                                <i className="ion-android-car"></i> Entrega a domicilio {venta.fechaEntregaDomicilio && 
                                    <span>{venta.fechaEntregaDomicilio.fecha} de {getHoraEntrega(venta.fechaEntregaDomicilio.horaA)} a {getHoraEntrega(venta.fechaEntregaDomicilio.horaB)}</span>
                                }
                            </div>
                        }
                    </div>

                    <div style={{maxHeight: '50vh', overflow: 'auto'}}>
                        <table className="table table-striped table-condensed vm">
                            <thead>
                                <tr>
                                    <th>Cant.</th>
                                    <th>Código</th>
                                    <th>UM</th>
                                    <th className="text-right">PU</th>
                                    <th className="text-right">Impte</th>
                                </tr>
                            </thead>
                            <tbody>
                                { venta.productos.map((p, i) => {
                                    return(
                                    <tr key={`vp-${i}`}>
                                        <td>{p.cantidad}</td>
                                        <td style={{maxWidth: '120px', wordBreak: 'break-word'}}>{p.producto.codigo} <small class="desc">{truncate(p.producto.descripcion, 50)}</small></td>
                                        <td>{truncate(p.producto.um.nombre, 5)}</td>
                                        <td className="text-right">${formatCurrency(p.precio_neto)}</td>
                                        <td className="text-right">${formatCurrency(p.importe)}</td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <table class="table table-sm vm text-right">
                        <tr className="text-primary h4">
                            <td style={{width: '65%'}}>Total:</td>
                            <td >
                                ${formatCurrency(venta.total)}
                            </td>
                        </tr>
                        { Boolean(venta.totalDescuento) &&
                        <tr>
                            <td>Descuento:</td>
                            <td>${formatCurrency(venta.totalDescuento)}</td>
                        </tr>
                        }
                        { Boolean(venta.efectivo && venta.efectivo.monto) &&
                        <tr>
                            <td>Efectivo:</td>
                            <td>
                                ${formatCurrency(venta.efectivo.monto)}
                            </td>
                        </tr>
                        }
                        { Boolean(venta.tarjeta && venta.tarjeta.monto) &&
                        <tr>
                            <td>Monto Tarjeta:</td>
                            <td>
                                ${formatCurrency(venta.tarjeta.monto)}
                            </td>
                        </tr>
                        }
                        { Boolean(venta.tarjeta && venta.tarjeta.cobros && venta.tarjeta.cobros.length) &&
                            <tbody>
                                {venta.tarjeta.cobros.map(c => { 
                                    return (
                                    <tr title={`Ref: ${c.datos.referencia}`} key={`cobro-tarjeta-${c._id}`} className="text-muted">
                                        <td title="Doble click para más información" onDoubleClick={(e) => {
                                            this.props.mostrarAlerta({
                                                titulo: `Transacción ${c.datos.referencia}`,
                                                mensaje: `
                                                    <table class="table table-sm table-striped mt-2">
                                                        <tbody>
                                                            <tr>
                                                                <td>Aprobación:</td>
                                                                <td>${c.datos.autorizacion}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>No. Control:</td>
                                                                <td>${c.datos.numeroControl}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Referencia:</td>
                                                                <td>${c.datos.referencia}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Tarjeta:</td>
                                                                <td>${getNumeroTarjeta(c.datos.noTarjeta)}</td>
                                                            </tr>
                                                            <tr>
                                                                <td>Importe:</td>
                                                                <td>$${formatCurrency(c.datos.importe)}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                `
                                            })
                                        }} style={{paddingBottom: 0, borderTop: 'none', cursor: 'help'}} className="text-right">
                                            Tarjeta {getNumeroTarjeta(c.datos.no_tarjeta)}:
                                        </td>
                                        <td style={{paddingBottom: 0, borderTop: 'none'}} className="text-right">
                                            ${formatCurrency(c.datos.importe)}
                                            <span title="Voucher Cliente" className="d-inline-block p-1 clickeable text-info" onClick={this.reimprimirVoucher.bind(this, 'cliente', c._id)}><i className="ion-printer"></i></span>
                                            <span title="Voucher Comercio" className="d-inline-block p-1 clickeable text-primary" onClick={this.reimprimirVoucher.bind(this, 'comercio', c._id)}><i className="ion-printer"></i></span>
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        }
                        { !venta.tarjeta.multiplesTarjetas &&
                            <tbody>
                                { Boolean(venta.tarjeta && venta.tarjeta.tipo_tarjeta) &&
                                <tr>
                                    <td>Tipo:</td>
                                    <td>
                                        {venta.tarjeta.tipo_tarjeta}
                                    </td>
                                </tr>
                                }
                                { Boolean(venta.tarjeta && venta.tarjeta.no_tarjeta) &&
                                <tr>
                                    <td>No. Tarjeta:</td>
                                    <td>
                                        {getNumeroTarjeta(venta.tarjeta.no_tarjeta)}
                                    </td>
                                </tr>
                                }
                            </tbody>
                        }
                        { Boolean(venta.tarjeta && venta.tarjeta.datos && !venta.tarjeta.multiplesTarjetas) &&
                            <tbody>
                                { Boolean(venta.tarjeta && venta.tarjeta.datos.autorizacion) &&
                                <tr>
                                    <td>Autorización:</td>
                                    <td>
                                        {venta.tarjeta.datos.autorizacion}
                                    </td>
                                </tr>
                                }
                                { Boolean(venta.tarjeta && venta.tarjeta.datos.referencia) &&
                                <tr>
                                    <td>Referencia:</td>
                                    <td>
                                        {venta.tarjeta.datos.referencia}
                                    </td>
                                </tr>
                                }
                            </tbody>
                        }
                        
                        { Boolean(venta.fondo && venta.fondo.monto) &&
                        <tr>
                            <td>Fondo:</td>
                            <td>
                                ${formatCurrency(venta.fondo.monto)}
                            </td>
                        </tr>
                        }
                        { Boolean(venta.monedero && venta.monedero.monto) &&
                        <tr>
                            <td>Monedero:</td>
                            <td>
                                ${formatCurrency(venta.monedero.monto)}
                            </td>
                        </tr>
                        }
                        { Boolean(venta.cambio) &&
                        <tr>
                            <td>Cambio:</td>
                            <td>
                                ${formatCurrency(venta.cambio)}
                            </td>
                        </tr>
                        }
                    </table>


                    { (!venta.esPedido && !venta.pendiente) &&
                        <button ref={btn => this.btnReenviar = btn} onClick={this.sincronizarVenta.bind(this)} className="btn btn-success btn-block">Sincronizar Venta</button>
                    }

                    { venta.pendiente &&
                        <Link to={`punto-venta/${venta._id}`} className="btn btn-info btn-block">
                            Concluir Venta
                        </Link>
                    }

                    { Boolean(venta.tarjeta.integracion && venta.tarjeta.integracion !== "prosepago") &&
                        <div className="row mt-2">
                            <div className="col">
                                <button onClick={this.reimprimirVoucher.bind(this, 'cliente', null)} className="btn btn-sm btn-block btn-default">
                                    Reimprimir Voucher (Cliente)
                                </button>
                            </div>
                            <div className="col">
                                <button onClick={this.reimprimirVoucher.bind(this, 'comercio', null)} className="btn btn-sm btn-block btn-default">
                                    Reimprimir Voucher (Comercio)
                                </button>
                            </div>
                        </div>
                    }
                    
                    { /*venta.habilitarEnvioEdicion && 
                        <button ref={btn => this.btnReenviar = btn} onClick={this.reenviarVenta.bind(this)} className="btn btn-primary btn-block">Reenviar</button>
                    */}
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({cerrarVenta, mensajeFlash, mostrarAlerta }, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(VentaComponent);