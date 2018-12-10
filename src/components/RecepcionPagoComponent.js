import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import formatCurrency from 'format-currency';
import moment from 'moment';
import {cerrarRecepcionPago, mensajeFlash, mostrarAlerta} from '../actions';
import { getNumeroTarjeta } from '../helpers';
import * as Api from '../api';
import * as Impresora from '../impresoras';

class RecepcionPagoComponent extends React.Component {
    
    reimprimirVoucher(tipo, cobroId=null) {
        Impresora.imprimirVoucher(this.props._id, this.props.api_key, {tipo: tipo, cobroId: cobroId, re: 1, recepcion_pago: true})
        .then(() => {

        })
        .catch((err) => {
            this.props.mensajeFlash('error', 'Hubo un error al imprmir el voucher.')

        })
    }


    render() {
        const recepcion_pago = this.props
        const abonos = Object.values(recepcion_pago.abonos)
        console.log(recepcion_pago)
        return (
            <div className="QuickView RecepcionPagoComponent">
                <div className="overlay" onClick={e => this.props.cerrarRecepcionPago()}></div>
            
                <div className="box">
                    <button onClick={e => this.props.cerrarRecepcionPago()} className="cerrar">
                        <i className="ion-close"></i>
                    </button>
                    <div className="text-center">
                        <h4 className="text-primary">Recepción de Pago</h4>
                        <h5>{this.props.referencia}</h5>
                        <hr className="m-1"/>

                        <h5 className="mb-0">{recepcion_pago.cliente.razon_social}</h5>
                        <div className="text-muted">{moment(recepcion_pago.fecha).format('DD/MM/YYYY HH:mm')}</div>
                    </div>
                    
                    { Boolean(abonos.length) &&
                    <div>
                        <div className="upper font-weight-bold text-center text-info border-top mt-1">Movimientos aplicados</div>
                        <div style={{maxHeight: '50vh', overflow: 'auto'}}>
                            <table className="table table-striped table-condensed vm">
                                <thead>
                                    <tr>
                                        <th>Folio</th>
                                        <th>Fecha</th>
                                        <th className="text-right">Total</th>
                                        <th className="text-right">Importe</th>
                                        <th className="text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { abonos.map((p, i) => {
                                        return(
                                        <tr key={`vp-${i}`}>
                                            <td>{p.folio}</td>
                                            <td>{moment(p.fecha).format('DD/MM/YYYY')}</td>
                                            <td className="text-right">${formatCurrency(p.importe)}</td>
                                            <td className="text-right">${formatCurrency(p.abono)}</td>
                                            <td className="text-right">${formatCurrency(p.saldo - p.abono)}</td>
                                        </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    }

                    <table class="table table-sm vm text-right">
                        <tr className="text-primary h4">
                            <td style={{width: '65%'}}>Total:</td>
                            <td >
                                ${formatCurrency(recepcion_pago.importe)}
                            </td>
                        </tr>
                        
                        { Boolean(recepcion_pago.totalDescuento) &&
                        <tr>
                            <td>Descuento:</td>
                            <td>${formatCurrency(recepcion_pago.totalDescuento)}</td>
                        </tr>
                        }

                        { Boolean(recepcion_pago.efectivo && recepcion_pago.efectivo.monto) &&
                        <tr>
                            <td>Efectivo:</td>
                            <td>
                                ${formatCurrency(recepcion_pago.efectivo.monto)}
                            </td>
                        </tr>
                        }

                        { Boolean(recepcion_pago.tarjeta && recepcion_pago.tarjeta.monto) &&
                        <tr>
                            <td>Monto Tarjeta:</td>
                            <td>
                                ${formatCurrency(recepcion_pago.tarjeta.monto)}
                            </td>
                        </tr>
                        }

                        { Boolean(recepcion_pago.tarjeta && recepcion_pago.tarjeta.cobros && recepcion_pago.tarjeta.cobros.length) &&
                            <tbody>
                                {recepcion_pago.tarjeta.cobros.map(c => { 
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

                        { Boolean(recepcion_pago.cambio) &&
                        <tr>
                            <td>Cambio:</td>
                            <td>
                                ${formatCurrency(recepcion_pago.cambio)}
                            </td>
                        </tr>
                        }
                    </table>


                    <button onClick={async e => {
                        try {
                            let sinc = await Api.sincronizarPago(this.props.api_key, this.props._id)
                            if (sinc.message) {
                                this.props.mensajeFlash(sinc.status || 'info', sinc.message)
                            }
                        } catch(e) {

                        }

                    }} ref={btn => this.btnReenviar = btn} className="btn btn-success btn-block">Sincronizar</button>
                    
                    { Boolean(recepcion_pago.tarjeta.integracion && recepcion_pago.tarjeta.integracion !== "prosepago") &&
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
                    
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({cerrarRecepcionPago, mensajeFlash, mostrarAlerta }, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(RecepcionPagoComponent);