import React from 'react';
import formatCurrency from 'format-currency';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as Api from '../api';
import {cargando, mensajeFlash, mostrarAlerta, verVenta} from '../actions';
import TituloComponent from '../components/TituloComponent';
import Paginador from '../components/PaginadorComponent';
import NoResultsComponent from '../components/NoResultsComponent';
import PromocionesProductoComponent from '../components/PromocionesProductoComponent';

class Productos extends React.Component {
	constructor(props) {
		super(props)
        
		this.state = {
            promocionesProducto: null,
            productos: [],
            paginador: {},
            filtro: {
                q: '',
                elemPorPag: 50,
            },
        }
	}

	componentDidMount() {
        this.obtenerProductos()
    }

    obtenerProductos() {
        this.props.cargando()
        Api.obtenerProductos({api_key: this.props.api_key, ...this.state.filtro})
        .then((res)  => {
            this.setState({productos: res.objects, paginador: res.paginador})
            this.props.cargando(false)
        })
        .catch((err) => {
            console.log(err)
            this.props.cargando(false)
        })
    }

    changeFiltro(campo, v) {
        
        if (v === this.state.filtro[campo]) {
            return
        }

        this.setState({
            filtro: {
                ...this.state.filtro,
                [campo]: v
            }
        })

        setTimeout(() => {
            this.obtenerProductos()
        }, 300)
    }

    onPageChange(resp) {
        if (resp.status === 'success') {
            this.setState({
                productos: resp.objects,
                paginador: resp.paginador
            })
        } else {
            console.log(resp)
        }
    }

    async sincronizarProducto(producto) {
        if (!this.sincronizarProductoBtn) {
            this.sincronizarProductoBtn = {}
        }

        this.sincronizarProductoBtn.disabled = true

        try {
            let status = await Api.obtenerProducto({
                id: producto.id,
                api_key: this.props.api_key,
                usuario_id: this.props.usuario.id,
                accion: 'sincronizar'
            })
            this.props.mensajeFlash(status.status, status.message)
            await this.obtenerProductos()
        } catch(e) {
            this.props.mostrarAlerta({mensaje: e.message})
        }

        this.sincronizarProductoBtn.disabled = false
    }

    async eliminarProducto(producto) {
        if (!this.eliminarProductoBtn) {
            this.eliminarProductoBtn = {}
        }

        this.eliminarProductoBtn.disabled = true

        this.props.mostrarAlerta({
            titulo: 'Confirme que desea continuar',
            mensaje: `¿Desea eliminar el producto <b>${producto.descripcion}</b>?`,
            cancelable: true,
            aceptarTxt: `Eliminar`,
            handleAceptar: async () => {
                try {
                    let status = await Api.obtenerProducto({
                        id: producto.id,
                        api_key: this.props.api_key,
                        usuario_id: this.props.usuario.id,
                        accion: 'eliminar'
                    })
                    this.props.mensajeFlash(status.status, status.message)
                    await this.obtenerProductos()
                    this.eliminarProductoBtn.disabled = false
                } catch(e) {
                    this.props.mostrarAlerta({mensaje: e.message})
                    this.eliminarProductoBtn.disabled = false
                }
            }
        })
    }

    eliminarProductos() {
        this.props.mostrarAlerta({
            titulo: 'Confirme que desea continuar',
            mensaje: `¿Desea eliminar ${this.state.paginador.total} productos?`,
            cancelable: true,
            aceptarTxt: `Eliminar ${this.state.paginador.total} productos`,
            handleAceptar: async () => {
                let statusEliminado = await Api.obtenerProductos({
                    api_key: this.props.api_key,
                    usuario_id: this.props.usuario.id,
                    accion: 'eliminar',
                    ...this.state.filtro
                })
                console.log(statusEliminado)
                this.props.mostrarAlerta({mensaje: statusEliminado.message})
                await this.obtenerProductos()
            }
        })
    }

    togglePromocion(producto) {
        this.setState({
            promocionesProducto: {producto}
        })
    }

    render() {  
        let productos = this.state.productos      
        return (
            <div className="container-fluid" ref={(comp) => {this.componente = comp }}>
            	<TituloComponent texto="Catálogo de Productos"></TituloComponent>

                { Boolean(productos.length) &&
                <div className="text-right">
                    <button onClick={this.eliminarProductos.bind(this)} className="btn btn-danger">Eliminar {this.state.paginador.total} registros</button>
                </div>
                }

                <div>
                    <div className="row">
                        <div className="col">
                            <div className="form-group">
                            <label htmlFor="">Buscar por texto:</label>
                                <input type="text" className="form-control"
                                    onKeyPress={async (e) => {
                                        if (e.key === 'Enter') {
                                            await this.changeFiltro('q', e.target.value)
                                            this.obtenerProductos()
                                        }
                                    }} 
                                    onBlur={(e) => {this.changeFiltro('q', e.target.value)}} />
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
                        <div className="col">
                            <div className="form-group">
                            <label htmlFor="">Activo:</label>
                                <select className="form-control" 
                                    value={this.state.filtro.activo}
                                    onChange={(e) => {this.changeFiltro('activo', e.target.value)}} >
                                    <option value="">Todos</option>
                                    <option value="1">Si</option>
                                    <option value="0">No</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                
                { Boolean(productos.length) ?
                    <div>
                        <table className="table table-condensed vm table-list table-hover table-list mb-4">
                            <thead>
                                <tr>
                                    <th>Activo</th>
                                    <th>Codigo</th>
                                    <th>Descripción</th>
                                    <th className="text-right">Precio</th>
                                    <th style={{width: '120px'}}></th>
                                </tr>
                            </thead>
                            <tbody>
                                { productos.map((producto) => {
                                    return (
                                    <tr key={`producto-${producto.id}`}>
                                        <td>{producto.activo ? 'Si' : 'No'}</td>
                                        <td>{producto.codigo}</td>
                                        <td>{producto.descripcion}</td>
                                        <td className="text-right">${formatCurrency(producto.precio_neto)}</td>
                                        <td className="text-right">
                                            { Boolean(producto.promociones.length > 0) && 
                                                (
                                                <button className="btn-clean" type="button" onClick={(e) => {this.togglePromocion(producto)} }>
                                                    <i className="ion-pricetags text-success" title="Producto con promoción"></i>
                                                </button>
                                                )
                                            }
                                            {/*<button ref={(b) => this.sincronizarProductoBtn = b } onClick={this.sincronizarProducto.bind(this, producto)} className="btn btn-info btn-sm mr-1" title="Actualizar producto"><i className="ion-refresh"></i></button>*/}
                                            <button ref={(b) => this.eliminarProductoBtn = b } onClick={this.eliminarProducto.bind(this, producto)} className="btn btn-danger btn-sm mr-1" title="Eliminar producto"><i className="ion-close"></i></button>
                                        </td>
                                    </tr>
                                    )
                                })
                                }
                            </tbody>
                        </table>
                        
                        <Paginador
                            paginas={this.state.paginador.paginas}
                            onResult={this.onPageChange.bind(this)}
                            paginaActual={this.state.paginador.pagina}
                        ></Paginador>
                    </div>
                :
                <NoResultsComponent msg="No hay ventas capturadas."></NoResultsComponent>
                }

                { this.state.promocionesProducto &&
                    <PromocionesProductoComponent 
                        producto={this.state.promocionesProducto.producto}
                        handleCerrar={(e) => { this.setState({promocionesProducto: null})}}>
                    </PromocionesProductoComponent>
                }
            </div>
        );
    }

}

const mapStateToProps = state => ({
    ...state.app,
    api_key: state.app.api_key,
});

const mapDispatchToProps = dispatch => bindActionCreators({
    cargando,
    mensajeFlash,
    verVenta,
    mostrarAlerta
}, dispatch);

export default connect(
	mapStateToProps,
    mapDispatchToProps
)(Productos);