import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Autocomplete from 'react-autocomplete';
import TituloComponent from './TituloComponent';
import TotalesComponent from './TotalesComponent';
import InlineProductoComponent from './InlineProductoComponent';
import PromocionesProductoComponent from './PromocionesProductoComponent';
import * as Api from '../api';
import { 
	ClienteAutocompleteView, 
	ProductoAutocompleteView, 
	MenuAutocompleteView 
} from '../constants/AutocompleteTemplates';
import { 
	seleccionarDireccionEntrega, 
	entregarDomicilio,
	eliminarProducto,
	guardarPedido,
	actualizarProductoInline,
	seleccionarUsoCFDI,
	seleccionarProducto,
	seleccionarCliente,
	nuevoPedido,
	editarPedido,
	setClienteAc,
	setUmProducto,
	infoExtraChange
} from '../actions/pedidosActions';
import { 
	cargando,
	mensajeFlash,
	autocompleteProducto,
	autocompleteCliente,
	mostrarAlerta,
} from '../actions';
import {
    getClienteObj, 
    getAlmacenObj, 
    getProductoObj
} from '../helpers';

import InputNumber from 'rc-input-number';
import '../../node_modules/rc-input-number/assets/index.css';

import '../containers/PuntoVenta.css';

class PedidoFormComponent extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			...props,
			cantidad: 1,
			modalUmProducto: null,
			guardar: {
				habilitado: true,
				texto: 'Guardar'
			}
		}

		this.timeoutId = null
	}

	handleSeleccionarDireccionEntrega(ev) {
		let id = ev.target.value;
		this.props.seleccionarDireccionEntrega(id)
	}

	renderDirecciones(direcciones) {
		const ds = [];
		if (direcciones) {
			direcciones.map(direccion => {
				return ds.push(
					<option value={direccion.id} key={`direccion-${direccion.id}`}>
						{direccion.direccion_completa}
					</option>
				);
			});
		}

		return (
			<select className="form-control" onChange={this.handleSeleccionarDireccionEntrega.bind(this)}>
				<option value="">Mismo Lugar</option>
				{ds}
			</select>
		);
	}

	onChangeCliente(ev) {
		if (ev.target.value) {
			let {autocompleteCliente, api_key} = this.props
			let q = ev.target.value
			clearTimeout(this.timeoutId)
			this.timeoutId = setTimeout(function () {
				autocompleteCliente('PEDIDOS_AUTOCOMPLETE_CLIENTE', api_key, q)
	        }, 200);
		}

		this.props.setClienteAc(ev.target.value)
	}

	onSelectCliente(value, obj) {
		this.props.seleccionarCliente(obj);
	}

	onChangeProducto(ev) {
		if (ev.target.value) {
			let {autocompleteProducto, api_key} = this.props
			let idAlmacen = this.props.almacen.id
			let q = ev.target.value
			clearTimeout(this.timeoutId)
			this.timeoutId = setTimeout(function () {
				autocompleteProducto('PEDIDOS_AUTOCOMPLETE_PRODUCTO', api_key, q, idAlmacen)
	        }, 200);
		}
		
		this.setState({...this.state, ac_producto: ev.target.value})
	}

	getProductoInline(cant=this.state.cantidad, obj) {
		let es_recarga = Number(obj.recarga_saldo_importe) > 0
        let es_servicio_ldi = Number(obj.ldi_servicio_id) > 0
        return {
            cantidad: cant, 
            es_recarga: es_recarga,
            es_servicio_ldi: es_servicio_ldi,
            producto: obj
        }
	}

	onSelectProducto(value, obj, cant=this.state.cantidad) {
		let producto
		cant = Number(cant)

		let productoIndex = this.props.productos.findIndex((p) => {
			if (p.producto.venta_cb_cantidad) {
				return false
			}

			return p.producto.id === obj.id
		})

		this.setState({...this.state, ac_producto: '', cantidad: 1})

		if (productoIndex > -1) {
			this.setCantidadProducto(cant + this.props.productos[productoIndex].cantidad, this.props.productos[productoIndex])
		} else {
			producto = this.getProductoInline(cant, obj)
			
			if (producto.es_recarga) {
				return this.props.mostrarAlerta({
					mensaje: 'No se puede agregar recargas en pedidos.'
				})
			}  else if (producto.es_servicio_ldi) {
				return this.props.mostrarAlerta({
					mensaje: 'No se puede agregar pagos de servicios en pedidos.'
				})

			} else {
				this.props.seleccionarProducto(producto)
			}
		}
	}

	seleccionarClienteDefault() {
		let clienteDefault = this.props.configuracion.facturacion.cliente_mostrador_default;
		this.props.seleccionarCliente(clienteDefault)
	}

	selectOnFocus (event) {
	  event.target.select();
	}

	eliminarProducto(producto, autorizado=false, index) {
		return this.props.eliminarProducto(producto, index)
	}

	getDatosVenta() {
		let data = {}
		const state = this.props
		const infoValida = [
			'_id', 'cliente', 'productos', 'uso_cfdi', 'direccionEntrega', 'extra_fields',
			'total', 'totalDescuento', 'totalArticulos', 'entregaDomicilio', 'usuario'
		]

		for(let k in state) {
			if (infoValida.indexOf(k) > -1) {
				data[k] = state[k]
			}
		}

		data.almacen = getAlmacenObj(this.props.almacen)
		data.cliente = getClienteObj(data.cliente)

		data.productos.forEach(p => {
            delete p.descuentoAutorizado
            delete p.descuentoAutorizadoImporte
            delete p.deshabilitarCantidad
            delete p.promociones
            delete p.activo

            p.producto = getProductoObj(p.producto)
        })
		return data
	}

	guardar() {
		if (! this.props.productos.length ) {
			this.props.mensajeFlash('error', "Ingrese productos para continuar.")
			return false
		}
		
		this.setState({guardar: {habilitado: false, texto: 'Guardando...'}})
		this.props.guardarPedido(this.props.api_key, this.getDatosVenta())
		setTimeout(() => {
			this.props.history.push('/pedidos')
		}, 700)
	}

	setCantidadProducto(cantidad, inline) {
		let producto  = this.getProductoInline(+cantidad, inline.producto)
		this.props.actualizarProductoInline(producto)
	}

	_obtenerSeleccionarProducto(q) {
		let idAlmacen = this.props.almacen.id
		return Api.autocompleteProducto(this.props.api_key, q, idAlmacen, 1)
		.then((data) => {
			if (data.productoCantidad) {
				return this.onSelectProducto(null, data.producto, data.cantidad)
			}

			if (data.objects.length) {
				return this.onSelectProducto(null, data.objects.pop())
			}
			this.props.mensajeFlash('error', 'El producto especificado no existe')
			this.setState({ac_producto: ''})
		})
	}

	handleProductoBlur(e)  {
		if (e.target.value !== "") {
			this._obtenerSeleccionarProducto(e.target.value)
		}
	}

	handleProductoKeyup(e) {
		let charCode = (typeof e.which === "number") ? e.which : e.keyCode
		if (charCode === 13) {
			if (e.target.value !== "") {
				this._obtenerSeleccionarProducto(e.target.value)
			}
		}
	}

	handleChangeExtraField(extra, e) {
		this.props.infoExtraChange(extra, e.target.value)
	}

	componentDidMount() {
		let pedidoID = this.props.match.params.id

		if (pedidoID) {
			this.props.editarPedido(this.props.api_key, pedidoID)
		} else {
			this.props.nuevoPedido()
			this.seleccionarClienteDefault()
			this.productoInput.focus()
		}

	}

	togglePromocionProducto(producto) {
		if (!this.state.modalPromocionesProducto) {
			this.setState({
				modalPromocionesProducto: {
					producto: producto
				}
			})
		} else {
			this.setState({
				modalPromocionesProducto: null
			})
		}
	}

	seleccionarUm(productoInline, index) {
		this.setState({
			modalUmProducto: {
				producto: productoInline,
				index: index
			}
		})
	}

	setUmProducto() {
		if (!this.state.modalUmProducto) {
			return 
		}

		let producto = this.state.modalUmProducto.producto;
		let um = producto.producto.ums.find((el) => {
			return +el.id === +this.um_producto_input.value
		})

		if (um && um.id !== producto.producto.um.id) {
			this.props.setUmProducto(um, this.state.modalUmProducto.index)
		} 
		this.setState({
			modalUmProducto: null
		})
	}

    render() {
        const {cliente} = this.props
        const {facturacion} = this.props.configuracion

        let productos = this.props.productos //this.props.productos.slice().reverse()
        let modalPromocionesProducto = this.state.modalPromocionesProducto
        let modalUmProducto = this.state.modalUmProducto

        return (
        	<div className="container-fluid mt-2">
        		<TituloComponent texto={this.props._id ? "Editar Pedido" : "Nuevo Pedido"}></TituloComponent>
	            <div className="form">
					<div className="row">
						<div className="col-md-7">
							<fieldset>
								<div className="row mb-1">
									<div className="col-12">
										<ul className="list-inline mb-0">
											<li className="d-inline-block mr-3">
												<div className="form-group">
													<label className="control control-checkbox">
														Entregar a domicilio
														<input 
															type="checkbox"
															checked={this.props.entregaDomicilio}
															onChange={(ev) => {
																this.props.entregarDomicilio()
															}}
														/>
														<div className="control_indicator"></div>
													</label>
												</div>
											</li>
										</ul>
									</div>
									<div className="col-7">
										<div className="form-group">
											<label htmlFor="">Cliente:</label>
											<Autocomplete
												wrapperStyle={{display:'block'}}
							                    items={this.props.ac_clientes || []}
							                    inputProps={{className:'form-control ac'}}
							                    renderItem={ClienteAutocompleteView}
							                    renderMenu={MenuAutocompleteView}
							                    getItemValue={(item) => {return item.razon_social}}
							                    value={this.props.ac_cliente}
							                    onChange={this.onChangeCliente.bind(this)}
							                    onSelect={this.onSelectCliente.bind(this)}
							                />
										</div>
										<small className="text-info">RFC: <span className="rfc font-weight-bold">{cliente.rfc}</span></small>
									</div>
									<div className="col">
										<div className="form-group">
											<label htmlFor="">Dirección Entrega:</label>
											{this.renderDirecciones(cliente.direcciones_entrega)}
										</div>
									</div>
								</div>

								<div className="row">
									<div className="col-12">
										<div className="form-group">
											<label htmlFor="">Uso CFDI:</label>
											<select 
												onChange={(e) => { this.props.seleccionarUsoCFDI(e.target.value) }} 
												className="form-control" 
												defaultValue={this.props.uso_cfdi}>
												{ this.props.configuracion.facturacion.uso_cfdi.map((elem) => {
													return <option value={elem.id} key={`usocfdi-${elem.id}`}>{elem.value}</option>
												  })
												}						
											</select>
										</div>

										{ (this.props.configuracion.mostrarCamposAdicionales && facturacion.extra_fields.length > 0) && 
											<div className="row">
											{ facturacion.extra_fields.map((extra) => {
												return (
													<div className="col" key={`extrafield-${extra.nombre}`}>
														<div className="form-group">
															<label htmlFor="">{extra.valor}:</label>
															<input 
																onChange={this.handleChangeExtraField.bind(this, extra)}
																value={this.props.extra_fields[extra.nombre]}
																type="text" 
																className="form-control" 
															/>
														</div>
													</div>
												)
											})}
											</div>
										}
									</div>

									<div className="col">
										<div className="form-group">
											<label htmlFor="">Cantidad:</label>
											<InputNumber
                                              style={{ width: '100%' }}
                                              value={this.state.cantidad} 
                                              onChange={(value) => {
                                                    if (+value < 0) {
                                                        value = 1
                                                    }
                                                    this.setState({cantidad: value})
                                                }}
                                            />
										</div>
									</div>

									<div className="col-9">
										<div className="form-group">
											<label htmlFor="">Producto:</label>
											<Autocomplete
												autoFocus
												delay={1000}
												wrapperStyle={{display:'block'}}
							                    items={this.props.ac_productos || []}
							                    ref={(input) => {this.productoInput = input}}
							                    inputProps={{
							                    	className:'form-control ac', 
							                    	onKeyUp:this.handleProductoKeyup.bind(this),
							                    	onBlur:this.handleProductoBlur.bind(this),
							                    }}
							                    renderItem={ProductoAutocompleteView}
							                    renderMenu={MenuAutocompleteView}
							                    getItemValue={(item) => {return item.descripcion}}
							                    onChange={this.onChangeProducto.bind(this)}
							                    value={this.state.ac_producto}
							                    onSelect={this.onSelectProducto.bind(this)}
							                />
										</div>
									</div>
								</div>
							</fieldset>

							{ (productos.length > 0) && 
								<InlineProductoComponent 
									productos={productos} 
									validarCantidad={false}
									onChangeCantidad={this.setCantidadProducto.bind(this)}
									onSeleccionarUm={this.seleccionarUm.bind(this)}
									onTogglePromocion={this.togglePromocionProducto.bind(this)}
									onEliminarProducto={this.eliminarProducto.bind(this)}
								>
								</InlineProductoComponent>
							}
						</div>

						<div className="col-md-5">
							<fieldset>
								<TotalesComponent
									totalArticulos={this.props.totalArticulos}
									totalDescuento={this.props.totalDescuento}
									total={this.props.total}
								>	
								</TotalesComponent>
							</fieldset>
							
							<div className="row">
								<div className="col">
									<button className="btn btn-secondary btn-block" onClick={(e) => {this.props.history.push('/pedidos')}}>
									Cancelar
									</button>
								</div>
								
								{ (productos.length > 0) &&
								<div className="col">
									<button  
										disabled={!this.state.guardar.habilitado}
										className="btn btn-primary btn-block" 
										onClick={this.guardar.bind(this)}
										>
											<i className="ion-printer"></i> {this.state.guardar.texto}
									</button>
								</div>
								}
							</div>
						</div>
					</div>	

					
					{ modalPromocionesProducto &&
						<PromocionesProductoComponent 
	                        producto={modalPromocionesProducto.producto.producto}
	                        handleCerrar={(e) => { this.setState({modalPromocionesProducto: null})}}>
	                    </PromocionesProductoComponent>
					}

					{ modalUmProducto &&
					<div className="dialog-box modalAutorizacion">

						<p className="text-info text-center">{modalUmProducto.producto.producto.descripcion}</p>

						<div className="form-group">
							<label htmlFor="">Seleccionar unidad de medida:</label>
							<select className="form-control" ref={(input) => {this.um_producto_input = input}}>
								{ modalUmProducto.producto.producto.ums.map(um => {
									return <option value={um.id} key={`ump-${um.id}`}>{um.nombre}</option>
								})}
							</select>
						</div>

						<div className="form-group text-right mt-2">
							<button className="btn btn-secondary mr-2" onClick={(e) => this.setState({modalUmProducto: null})} tabIndex="-1">
								Cancelar
							</button>
							<button className="btn btn-primary" onClick={this.setUmProducto.bind(this)}>
								Aceptar
							</button>
						</div>
					</div>
					}
				</div>
			</div>
        )
    }
}


const mapStateToProps = state => ({
    ...state.pedidos,
    configuracion: state.app.configuracion,
    usuario: state.app.usuario,
    almacen: state.app.configuracion.almacen,
    api_key: state.app.api_key
});

const mapDispatchToProps = dispatch => bindActionCreators({
	seleccionarDireccionEntrega, 
	autocompleteProducto,
	autocompleteCliente, 
	eliminarProducto,
	cargando,
	entregarDomicilio,
	guardarPedido,
	actualizarProductoInline,
	seleccionarUsoCFDI,
	infoExtraChange,
	mensajeFlash,
	seleccionarProducto,
	editarPedido,
	setClienteAc,
	nuevoPedido,
	setUmProducto,
	mostrarAlerta,
	seleccionarCliente
}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(PedidoFormComponent);