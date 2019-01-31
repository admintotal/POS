import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import formatCurrency from 'format-currency';
import moment from 'moment';
import {mensajeFlash, mostrarAlerta} from '../actions';
import * as Impresora from '../impresoras';

class RetirosEfectivoComponent extends React.Component {
    
    imprimirRetiro(retiro) {
        Impresora.imprimirRetiroEfectivo(this.props.api_key, retiro._id)
        .then(() => {

        })
        .catch((err) => {
            this.props.mensajeFlash('error', 'Hubo un error al imprmir el voucher.')

        })
    }

    render() {
        return (
            <div className="QuickView RetirosEfectivoComponent">
                <div className="overlay" 
                    onClick={e => {
                        if (this.props.handleCerrar) {
                            this.props.handleCerrar() 
                        }
                    }}>
                </div>
            
                <div className="box">
                    <button onClick={e => {
                        if (this.props.handleCerrar) {
                            this.props.handleCerrar() 
                        }
                    }} className="cerrar">
                        <i className="ion-close"></i>
                    </button>
                    <div className="text-center">
                        <h4 className="text-primary">Retiros de Efectivo</h4>
                        { (this.props.sesionCaja && this.props.sesionCaja.cajero) &&
                        <div className="text-muted">Sesión de <b>{this.props.sesionCaja.cajero.username}</b></div>
                        }
                    </div>

                    <div style={{maxHeight: '50vh', overflow: 'auto'}}>
                        <table className="table table-striped table-condensed vm">
                            <thead>
                                <tr>
                                    <th>Sinc</th>
                                    <th>Creado</th>
                                    <th className="text-right">Monto</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                { this.props.retiros.map((r, i) => {
                                    return(
                                    <tr key={`re-${i}`}>
                                        <td>{r.sincronizado ? <span class="badge badge-success">Si</span> : <span class="badge badge-default">Pendiente</span>}</td>
                                        <td title={moment(r.fecha).format('DD/MM/YYYY HH:mm:ss')}>{r.fecha ? moment(r.fecha).fromNow() : ''}</td>
                                        <td className="text-right">${formatCurrency(r.totalFondo)}</td>
                                        <td className="text-right">
                                            <button 
                                                onClick={this.imprimirRetiro.bind(this, r)} 
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
                        <div className="h4 text-right text-primary">Total: ${formatCurrency(this.props.total)}</div>
                    </div>


                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({mensajeFlash, mostrarAlerta }, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(RetirosEfectivoComponent);