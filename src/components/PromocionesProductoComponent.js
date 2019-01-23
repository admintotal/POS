import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { mostrarAlerta } from '../actions';
import formatCurrency from 'format-currency';

class PromocionesProductoComponent extends React.Component {
    render() {
        return (
            <div className="dialog-box">
                <div className="text-primary text-center h5">Promociones por producto</div>

                <p className="text-info text-center">{this.props.producto.descripcion}</p>

                <table className="table table-list table-hover table-condensed table-striped vm">
                    <thead>
                        <tr>
                            <th className="text-right">Cantidad</th>
                            <th className="text-right">Valor Unitario</th>
                            <th className="text-right">Precio Neto</th>
                            <th>Vencimiento</th>
                        </tr>
                    </thead>
                    <tbody>
                        { this.props.producto.promociones.map((p) => {
                            return (
                                <tr key={`promo-${p.cantidad}`}>
                                    <td className="text-right">{formatCurrency(p.cantidad)}</td>
                                    <td className="text-right">${formatCurrency(p.valor_unitario)}</td>
                                    <td className="text-right">${formatCurrency(p.precio_neto)}</td>
                                    <td>{p.vencimiento}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                <div className="form-group text-right mt-2">
                    <button className="btn btn-secondary mr-2" onClick={(e) => this.props.handleCerrar()} tabIndex="-1">
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
	
});

const mapDispatchToProps = dispatch => bindActionCreators({mostrarAlerta}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PromocionesProductoComponent);