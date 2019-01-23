import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as Api from '../api';
import {cargando, mensajeFlash, mostrarAlerta, verVenta} from '../actions';
import TituloComponent from '../components/TituloComponent';
import Paginador from '../components/PaginadorComponent';
import NoResultsComponent from '../components/NoResultsComponent';

class Clientes extends React.Component {
	constructor(props) {
		super(props)
        
		this.state = {
            clientes: [],
            paginador: {},
            filtro: {
                q: '',
                elemPorPag: 50,
            },
        }
	}

	componentDidMount() {
        this.obtenerClientes()
	}

    async obtenerClientes() {
        this.props.cargando()
        Api.obtenerClientes({api_key: this.props.api_key, ...this.state.filtro})
        .then((res)  => {
            this.setState({clientes: res.objects, paginador: res.paginador})
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
            this.obtenerClientes()
        }, 300)
    }

    onPageChange(resp) {
        if (resp.status === 'success') {
            this.setState({
                clientes: resp.objects,
                paginador: resp.paginador
            })
        } else {
            console.log(resp)
        }
    }

    eliminarClientes() {
        this.props.mostrarAlerta({
            titulo: 'Confirme que desea continuar',
            mensaje: `¿Desea eliminar ${this.state.paginador.total} clientes?`,
            cancelable: true,
            aceptarTxt: `Eliminar ${this.state.paginador.total} clientes`,
            handleAceptar: async () => {
                let statusEliminado = await Api.obtenerClientes({
                    api_key: this.props.api_key,
                    usuario_id: this.props.usuario.id,
                    accion: 'eliminar',
                    ...this.state.filtro
                })
                console.log(statusEliminado)
                this.props.mostrarAlerta({mensaje: statusEliminado.message})
                await this.obtenerClientes()
            }
        })
    }

    async eliminarCliente(cliente) {
        if (!this.eliminarClienteBtn) {
            this.eliminarClienteBtn = {}
        }

        this.eliminarClienteBtn.disabled = true


        this.props.mostrarAlerta({
            titulo: 'Confirme que desea continuar',
            mensaje: `¿Desea eliminar al cliente <b>${cliente.razon_social}</b>?`,
            cancelable: true,
            aceptarTxt: `Eliminar`,
            handleAceptar: async () => {
                try {
                    let status = await Api.obtenerCliente({
                        id: cliente.id,
                        api_key: this.props.api_key,
                        usuario_id: this.props.usuario.id,
                        accion: 'eliminar'
                    })
                    this.props.mensajeFlash(status.status, status.message)
                    await this.obtenerClientes()
                    this.eliminarClienteBtn.disabled = false
                } catch(e) {
                    this.props.mostrarAlerta({mensaje: e.message})
                    this.eliminarClienteBtn.disabled = false
                }
            }
        })
    }

    render() {
        let clientes = this.state.clientes   
        return (
            <div className="container-fluid" ref={(comp) => {this.componente = comp }}>
            	<TituloComponent texto="Catálogo de Clientes"></TituloComponent>

                { Boolean(clientes.length) &&
                <div className="text-right">
                    <button onClick={this.eliminarClientes.bind(this)} className="btn btn-danger">Eliminar {this.state.paginador.total} registros</button>
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
                                            this.obtenerClientes()
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
                        
                    </div>
                </div>
                
                { Boolean(clientes.length) ?
                    <div>
                        <table className="table table-condensed vm table-list table-hover table-list mb-4">
                            <thead>
                                <tr>
                                    <th>RFC</th>
                                    <th>Razón Social</th>
                                    <th style={{width: '120px'}}></th>
                                </tr>
                            </thead>
                            <tbody>
                                { clientes.map((cliente) => {
                                    return (
                                    <tr key={`producto-${cliente.id}`}>
                                        <td>{cliente.rfc}</td>
                                        <td>{cliente.razon_social}</td>
                                        <td className="text-right">
                                            <button 
                                                ref={(b) => this.eliminarClienteBtn = b } 
                                                onClick={this.eliminarCliente.bind(this, cliente)} 
                                                className="btn btn-danger btn-sm mr-1" 
                                                title="Eliminar producto" >
                                                <i className="ion-close"></i>
                                            </button>
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
)(Clientes);