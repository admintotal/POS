import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { truncate } from '../helpers';
import formatCurrency from 'format-currency';
import InputNumber from 'rc-input-number';
import '../../node_modules/rc-input-number/assets/index.css';

class InlineProductoComponent extends React.Component {
    render() {
    	let productos = this.props.productos
    	let validarCantidad = this.props.validarCantidad === undefined ? true : this.props.validarCantidad

        return (
        <div className="table-responsive">
            <table className="table table-striped productos mt-2 vm mb-0">
				<thead>
					<tr>
						<th style={{width: '100px'}}>Cant.</th>
						<th>Producto</th>
						<th>UM</th>
						<th className="text-right">P.U</th>
						<th className="text-right">P.R</th>
						<th className="text-right">Importe</th>
						{ this.props.habilitarDescuentosAutorizados &&
						<th>Desc.</th>
						}
						<th></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{ productos.map((p, index) => {
						let productoDescontinuado = false
						if (p.activo !== undefined) {
							productoDescontinuado = p.activo
						}

						console.log(p)

						return (
						<tr title={`${ !productoDescontinuado ? '': 'Producto descontinuado'}`} key={`inline-${index}-${p.producto.id}`} className={`${p.activo ? '' : 'table-danger'}`}>
							<td>
								{ (!p.es_recarga) && 
								<InputNumber
                                  style={{ width: '100%' }}
                                  value={p.cantidad}
                                  disabled={validarCantidad ? (p.producto.venta_cb_cantidad || Boolean(p.deshabilitarCantidad)) : false}
                                  onChange={(value) => {
                                        if (+value < 0) {
                                            value = 1
                                        }
                                        this.props.onChangeCantidad(value, p, index)
                                    }}
                                />
								}
							</td>
							<td>
								<div className="codigo">{p.producto.codigo}</div>
								<div className="descripcion" title={p.producto.descripcion}>{truncate(p.producto.descripcion, 50)}</div>
								{ p.numeroTelefonico && 
								<div className="numTelefonico">{p.numeroTelefonico}</div>
								}
								{ p.es_servicio_ldi &&
								<div>
									<div className="numTelefonico" title={p.producto.servicio_ldi_referencia}>
										{truncate(p.producto.servicio_ldi_referencia, 30)}
									</div>
								</div>
								}
							</td>
							<td className="um">
								{ Boolean(p.producto.um) &&
								<button title={p.producto.um.nombre} className="btn-clean" onClick={() => {this.props.onSeleccionarUm(p, index)}}>
									{truncate(p.producto.um.nombre, 5)}
								</button>
								}
							</td>
							<td className="text-right">${formatCurrency(p.precio_neto)}</td>
							<td className="text-right">${formatCurrency(p.precio_regular)}</td>
							<td className="text-right">${formatCurrency(p.importe)}</td>
							{ this.props.habilitarDescuentosAutorizados &&
							<td>
								<InputNumber
                                  style={{ width: '95px' }}
                                  min={0}
                                  value={p.descuentoAutorizado || ''}
                                  key={`desc-${index}`} 
                                  onChange={(value) => {
                                        if (!value || value < 0) {
                                            value = 0
                                        }

                                        if (this.props.onChangeDescuento) {
                                        	this.props.onChangeDescuento(value, p, index)
                                        }
                                    }}
                                />
							</td>
							}
							<td>
								{ p.producto.debajoMargen &&
									(
									<button className="btn-clean" type="button">
										<i className="ion-alert text-warning" title="Producto por debajo del margen"></i>
									</button>
									)
								}
								{ Boolean(p.promociones && p.promociones.length > 0) && 
									(
									<button className="btn-clean" type="button" onClick={(e) => {this.props.onTogglePromocion(p)} }>
										<i className="ion-pricetags text-success" title="Producto con promoción"></i>
									</button>
									)
								}

								{ (Boolean(p.producto.venta_cb_cantidad)) && 
									(
									<button className="btn-clean" type="button" onClick={(e) => {this.props.onToggleEditar(p, index)} }>
										<i className="ion-compose text-primary" title="Editar"></i>
									</button>
									)
								}
							</td>
							<td className="text-right actions">
								{ !Boolean(p.deshabilitarBorrado) &&
								<button onClick={(ev) => {this.props.onEliminarProducto(p, false, index)}} className="btn eliminar" type="button">
									<i className="ion-close"></i>
								</button>
								}
							</td>
						</tr>
						)
					})}
				</tbody>
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
)(InlineProductoComponent);