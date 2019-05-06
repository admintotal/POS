import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import TituloComponent from '../components/TituloComponent';
import {autocompleteProducto} from '../actions/index'
import Autocomplete from 'react-autocomplete';
import * as Api from '../api';
import { 
	ProductoAutocompleteView, 
	MenuAutocompleteView 
} from '../constants/AutocompleteTemplates';
import formatCurrency from 'format-currency';
import { mensajeFlash, mostrarAlerta } from '../actions';
import { Link } from 'react-router-dom';

class VerificadorPrecios extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			ac_producto: '',
			producto: null,
			existenciaAt: false
		}

		this.timeoutId = null
	}

	onSelectProducto(value, obj={}, cant=this.state.cantidad) {
		cant = Number(cant)
		let porCodigo = Boolean(value) && !obj.id
		this.setState({...this.state, ac_producto: '', cantidad: 1})

		Api.getProducto(this.props.api_key, obj.id || value, porCodigo).then((res) => {
			let producto = res.producto
			console.log(producto)
			this.setState({producto: producto, existenciaAt: res.existenciaAt})
		})
		.catch((err) => {
			this.props.mostrarAlerta({
				titulo: 'Error al seleccionar el producto',
				mensaje: err.message || 'Hubo un error al seleccionar el producto'
			})
			// this.props.mensajeFlash('error', err.message || 'Hubo un error al seleccionar el producto', 6000)
		})
	}

	onChangeProducto(ev) {
		if (ev.target.value) {
			let {autocompleteProducto, api_key} = this.props
			let idAlmacen = this.props.almacen.id
			let q = ev.target.value
			clearTimeout(this.timeoutId)
			this.timeoutId = setTimeout(function () {
				autocompleteProducto('VP_AUTOCOMPLETE_PRODUCTO', api_key, q, idAlmacen)
	        }, 200);
		}
		
		this.setState({...this.state, ac_producto: ev.target.value})
	}

	handleProductoKeyup(e) {
		let charCode = (typeof e.which === "number") ? e.which : e.keyCode
		if (charCode === 13) {
			if (e.target.value !== "") {
				this._obtenerSeleccionarProducto(e.target.value)
			}
		}
	}

	_obtenerSeleccionarProducto(q) {
		return this.onSelectProducto(q)
	}

	handleProductoBlur(e)  {
		if (e.target.value !== "") {
			this._obtenerSeleccionarProducto(e.target.value)
		}
	}

	changeUm(e) {
		let um = this.state.producto.ums.find(u => {
			return +u.id === +e.target.value
		})
		this.setState({
			producto: {
				...this.state.producto,
				um: um
			}
		})
	}

	componentDidMount() {
		if (this.productoInput) {
			this.productoInput.focus()
		}
	}

    render() {
        return (
            <div className="container-fluid">
            	<TituloComponent texto="Verificador de Precios"></TituloComponent>
            	<div className="row justify-content-md-center mt-2">
            		<div className="col-md-5">
            			<fieldset>
            				<div className="form-group">
		            			<label htmlFor="">Buscar Producto:</label>
			            		<div class="input-group mb-3">
									<Autocomplete
										autoFocus
										delay={1000}
										wrapperStyle={{display:'block', width: '90%'}}
					                    items={this.props.ac_productos || []}
					                    ref={(input) => {this.productoInput = input}}
					                    inputProps={{
					                    	className: 'form-control ac input-lg', 
					                    	onKeyUp: this.handleProductoKeyup.bind(this),
					                    	onBlur: this.handleProductoBlur.bind(this),
					                    }}
					                    renderItem={ProductoAutocompleteView}
					                    renderMenu={MenuAutocompleteView}
					                    getItemValue={(item) => {return item.descripcion}}
					                    onChange={this.onChangeProducto.bind(this)}
					                    value={this.state.ac_producto}
					                    onSelect={this.onSelectProducto.bind(this)}
					                />
									<div class="input-group-append">
									    <button className="btn btn-primary input-group-text"><i class="ion-search"></i></button>
									</div>
								</div>
							</div>
							<div className="text-right">
								<Link to="/punto-venta" className="btn btn-link text-info font-weight-bold">
									Regresar al Punto de Venta
								</Link>
							</div>
						</fieldset>
            		</div>
            	
					<div className="col-md-7">
						{ this.state.producto && 
		            	<div>
		            		<fieldset>
			            		<div>
			            			<div className="row">
			            				{(Boolean(this.state.producto.imagen)) &&
			            				<div className="col-md-4">
					            			<div style={{width: '200px'}}>
					            				<img src={this.state.producto.imagen} className="img-fluid" alt={this.state.producto.codigo} />
					            			</div>
			            				</div>
					            		}
			            				<div className="col">
			            					<div className="text-primary">{this.state.producto.codigo}</div>
			            					<h4 className="text-muted">
				            					{this.state.producto.descripcion}
				            				</h4>
			            					<h2 className="text-success mb-0">
				            					${formatCurrency(this.state.producto.precio_neto * this.state.producto.um.factor)}
				            				</h2>
				            				<select  onChange={this.changeUm.bind(this)} className="form-control" value={this.state.producto.um.id}>
				            					{ this.state.producto.ums.map(um => {
				            						return (<option value={um.id} key={um.id}>{um.nombre}</option>)
				            					})}
				            				</select>
			            				</div>
			            			</div>
		            			</div>
	            			</fieldset>

	            			{ this.state.existenciaAt &&
	            				<div>
	                                <table className="table table-condensed vm table-list table-hover">
	                                    <thead>
	                                        <tr>
	                                            <th>{this.props.configuracion.inventario.palabra_almacen}</th>
	                                            <th>Existencia</th>
	                                        </tr>
	                                    </thead>
	                                    <tbody>
	                                        {this.state.producto.existenciasAlmacen.map(e => {
	                                            return (
	                                            <tr class={this.props.configuracion.almacen.id === e.almacen.id ? 'active' : ''} key={`ex-${e.almacen.id}`}>
	                                                <td>{e.almacen.nombre}</td>
	                                                <td>
	                                                    <b className={(+e.existencia > 0) ? 'text-success': 'text-danger'}>
	                                                        {+e.existencia}
	                                                    </b>
	                                                </td>
	                                            </tr>
	                                            )
	                                        })}
	                                    </tbody>
	                                </table>
	                            </div>
	            			}

							{ this.state.producto.promociones.length ?
								<div>
									<h4 className="text-primary text-center">Promociones</h4>
			            			<table className="table table-condensed vm table-list table-hover">
			            				<thead>
			            					<tr>
			            						<th>Cantidad</th>
			            						<th className="text-right">Valor Unitario</th>
			            						<th className="text-right">Precio Neto</th>
			            					</tr>
			            				</thead>
			            				<tbody>
			            				{ this.state.producto.promociones.map((p) => {
			            					return (
			            					<tr>
			            						<td>{formatCurrency(p.cantidad)}</td>
			            						<td className="text-right">${formatCurrency(p.valor_unitario)}</td>
			            						<td className="text-right">${formatCurrency(p.precio_neto)}</td>
			            					</tr>
			            					)
			            				})}
			            				</tbody>
			            			</table>
								</div>
		            			:
		            			<div className="alert alert-sm alert-info mt-2">
		            				Este producto no cuenta con promociones.
		            			</div>
		            		}
		            	</div>
		            	}
	            	</div>
            	</div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
	...state.verificadorPrecios,
	configuracion: state.app.configuracion,
	almacen: state.app.configuracion.almacen,
	usuario: state.app.usuario,
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({autocompleteProducto, mensajeFlash, mostrarAlerta}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(VerificadorPrecios);