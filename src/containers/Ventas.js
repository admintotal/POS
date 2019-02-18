import React from 'react';
import formatCurrency from 'format-currency';
import moment from 'moment';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import * as Api from '../api';
import {cargando, mensajeFlash, mostrarAlerta, verVenta} from '../actions';
import * as Impresora from '../impresoras';
import TituloComponent from '../components/TituloComponent';
import RetirosEfectivoComponent from '../components/RetirosEfectivoComponent';
import Paginador from '../components/PaginadorComponent';
import NoResultsComponent from '../components/NoResultsComponent';
import IngresoAutorizacionComponent from '../components/IngresoAutorizacionComponent';
import { Link } from 'react-router-dom';
import ReactDatetime from 'react-datetime';
import '../../node_modules/react-datetime/css/react-datetime.css';
import queryString from 'query-string';

class Ventas extends React.Component {
	constructor(props) {
		super(props)
        
		this.state = {
            ventasSeleccionadas: [],
            paginador: {},
            filtroVentas: {
                visible: false,
                usuario: props.usuario.id,
                status: [''],
                folio: '',
                desde: moment().startOf('day'),
                hasta: moment().endOf('day'),
                elemPorPag: 50,
            },
            habilitarSinc: true,
            autorizadoListadoVentas: props.usuario.autorizaciones.movimientos_notas_venta || false
        }
	}

	componentDidMount() {
        let qs = queryString.parse(this.props.location.search)
        let filtro = {}

        if (qs.pendientesSinc) {
            filtro = {
                ...this.state.filtroVentas,
                visible: true,
                status: ['error', 'pendientes'],
                desde: this.props.sesionCaja ? moment(this.props.sesionCaja.fecha) : undefined,
                hasta: undefined,
                sesion_caja: this.props.sesionCaja ? this.props.sesionCaja._id : ''
            }
            this.setState({
                ...this.state,
                filtroVentas: filtro
            })
        }

        this.obtenerVentas(filtro)
	}

    obtenerVentas(filtro={}) {
        this.props.cargando()
        Api.obtenerVentas(this.props.api_key, {...this.state.filtroVentas, ...filtro}, true)
        .then((res)  => {
            this.setState({ventas: res.objects, retiros: res.retiros, paginador: res.paginador, ventasRealizadas: res.ventasRealizadas})
            this.props.cargando(false)
        })
        .catch((err) => {
            this.props.mensajeFlash('error', err)
            this.props.cargando(false)
        })
    }

    async sincronizarVentas() {
        let comp = this
        comp.setState({habilitarSinc: false})
        try {
            await Api.sincronizarFacturasNoTimbradas(this.props.api_key)
        } catch(e) {

        }
        
        try {
            let result = await Api.sincronizarVentas(this.props.api_key, {forzar: true, desde: this.state.filtroVentas.desde, hasta: this.state.filtroVentas.hasta})
            comp.setState({habilitarSinc: true})
            if (result.status === 'success') {
                this.obtenerVentas()
                if (result.message) {
                    this.props.mensajeFlash('success', `${result.message}`)
                } else{ 
                    this.props.mensajeFlash('success', `${result.ventas.length} ventas han sido sincronizadas.`)
                }
            } else {
                this.props.mensajeFlash('error', result.message || result.data)
            }
        } catch(e) {
            this.props.mensajeFlash('error', e.message || 'Hubo un error al sincronizar las ventas.')
        }
    }

    sincronizarVenta(id) {
        Api.sincronizarVenta(this.props.api_key, id).then((result) => {
            if (result.status === 'error') {
                return this.props.mensajeFlash('error', result.data || result.message)
            }
            
            this.obtenerVentas()
            this.props.mensajeFlash('success', 'La venta ha sido sincronizada correctamente.')
        })
    }

    mostrarJsonVenta(v) {
        let obj = {...v}
        delete obj.sesionCaja
        this.props.mostrarAlerta({mensaje: JSON.stringify(obj, undefined, 4)})
    }

    handleImprimirVenta(v) {
        let conf = {}
        if (this.props.configuracion.impresora) {
            conf.marginLeft = this.props.configuracion.impresora.marginLeft;
            conf.paperWidth = this.props.configuracion.impresora.paperWidth;
        }

        Impresora.imprimirReciboVenta(v._id, this.props.api_key, {
            url: v.urlReciboVenta,
            conf: conf
        })
    }

    exportarVentasConError() {
        Api.exportarVentasConError(this.props.api_key)
    }

    mostrarRetiros() {
        /*
        this.state.retiros.objects.map(r => {
            return trs.push(`
                <tr>
                    <td>${r.sincronizado ? '<span class="badge badge-success">Si</span>' : '<span class="badge badge-default">Pendiente</span>'}</td>
                    <td title="${moment(r.fecha).format('DD/MM/YYYY HH:mm:ss')}">${r.fecha ? moment(r.fecha).fromNow() : ''}</td>
                    <td class="text-right b text-primary">$${formatCurrency(r.totalFondo)}</td>
                </tr>
            `)
        })

        this.props.mostrarAlerta({
            titulo: 'Retiros de Efectivo',
            mensaje: `
                <table class="table table-striped table-condensed vm">
                    <thead>
                        <tr>
                            <th>Sinc</th>
                            <th>Creado</th>
                            <th class="text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trs.join('')}
                    </tbody>
                </table>
                <h4 class="text-right">Total: $${formatCurrency(this.state.retiros.totalRetirado)}</h4>
            `
        })
        */
    }

    titleRowVenta(venta) {
        let title = ''

        if (venta.motivoError) {
            title = `Error: ${venta.motivoError}`
        } else if (venta.sincHabilitada === false) {
            title = 'Enviando venta a Admintotal'
        } else if(venta.requiereFactura) {
            if (venta.timbrada) {
                title = 'Venta Timbrada'
            } else {
                title = 'Venta No Timbrada'
            }
        }

        return title
    }

    cssRowVenta(venta) {
        let rowCss = []

        if (venta.requiereFactura) {
            if (venta.timbrada) {
                rowCss.push('text-info')
            } else {
                rowCss.push('text-secondary')
            }

        }

        if (venta.sincHabilitada === false) {
            rowCss.push('sincronizando')
        }

        return rowCss.join(' ')
    }

    changeFiltroVentas(campo, v) {
        
        if (v === this.state.filtroVentas[campo]) {
            return
        }

        // validación fecha
        if (['desde', 'hasta'].indexOf(campo) > -1) {
            if (typeof v === "string" && v !== "") {
                return 
            }
        }

        this.setState({
            filtroVentas: {
                ...this.state.filtroVentas,
                [campo]: v
            }
        })

        setTimeout(() => {
            this.obtenerVentas()
        }, 300)
    }

    onPageChange(resp) {
        if (resp.status === 'success') {
            this.setState({
                ventas: resp.objects,
                paginador: resp.paginador
            })
        } else {
            
        }
    }

    onValidarAutorizacion(valido) {
        this.setState({
            autorizadoListadoVentas: valido
        })

        if (!valido) {
            this.props.mensajeFlash('error', 'La clave ingresada es incorrecta.')
        }
    }

    cambiarSerie() {
        if (this.inputCambioSerieInput) {
            let nuevaSerie = this.inputCambioSerieInput.value

            if (!nuevaSerie || nuevaSerie === '') {
                this.inputCambioSerieInput.focus()
            }

            this.props.mostrarAlerta({
                titulo: 'Confirme para continuar',
                mensaje: `¿Desea asignar la serie <b>${nuevaSerie}</b> a ${this.state.ventasSeleccionadas.length} ventas?`,
                cancelable: true,
                aceptarTxt: 'Sí, cambiar serie',
                handleAceptar: async () => {
                    this.props.cargando()
                    try {
                        let statusCambio = await Api.cambiarSerieVentas({
                            api_key: this.props.api_key, 
                            ventas: this.state.ventasSeleccionadas,
                            serie: nuevaSerie
                        })

                        await this.sincronizarVentas()
                        await this.obtenerVentas()

                        this.props.cargando()

                        this.props.mensajeFlash(statusCambio.status, statusCambio.message)

                        if (statusCambio.status === 'success') {
                            this.setState({modalEditarSerie: null, ventasSeleccionadas: []})
                        }

                    } catch(e) {
                        this.props.cargando()
                        this.props.mensajeFlash('error', e.message || 'Hubo un error al cambiar el status.')
                    }
                }
            })
        }
    }

    render() {
        let ventas = this.state.ventas || []
        let ventasSeleccionadas = this.state.ventasSeleccionadas || []
        let retiros = this.state.retiros || {}
        let usuario = this.props.usuario
        let autorizadoListadoVentas = this.state.autorizadoListadoVentas
        let modalEditarSerie = this.state.modalEditarSerie

        if (! autorizadoListadoVentas) {
            return (
                <IngresoAutorizacionComponent 
                    nombreAutorizacion='movimientos_notas_venta'
                    api_key={this.props.api_key} 
                    onValidar={this.onValidarAutorizacion.bind(this)}>
                </IngresoAutorizacionComponent>
            )
        }
        
        return (
            <div className="container-fluid" ref={(comp) => {this.componente = comp }}>
            	<TituloComponent texto="Ventas"></TituloComponent>
                
                <div className="topButtons text-right mb-2">
                    { (this.props.configuracion.habilitarPinpad && (this.props.configuracion.pinpad.banco || '').toLowerCase() === "banorte") &&
                    <Link to="/consulta-transacciones-pinpad" className="btn btn-link text-info mr-2">
                        Consultar Transacciones Pinpad
                    </Link>
                    }

                    <button className="btn btn-link text-info mr-2">
                        Ventas Realizadas: <b>{this.state.ventasRealizadas || 0}</b>
                    </button>

                    { Boolean(retiros.totalRetirado && retiros.totalRetirado > 0) &&
                        <button className={`btn btn-link text-${retiros.objects.length === retiros.sincronizados ? 'info' : 'warning'} mr-2`} onClick={(e) => {
                            this.setState({
                                mostrarRetiros: true
                            })
                        }}>
                            Total Retirado: <b>${formatCurrency(retiros.totalRetirado)}</b>
                        </button>
                    }

                    { Boolean(usuario.autorizaciones.guardar_configuracion_desktop && ventasSeleccionadas.length) &&
                        <button onClick={(e) => this.setState({modalEditarSerie: true})} className="btn btn-primary mr-2">
                            Cambiar Serie ({ventasSeleccionadas.length} ventas)
                        </button>
                    }

                    { Boolean(ventas.length) &&
                        <span>
                            <button className="btn btn-info ml-1" onClick={this.sincronizarVentas.bind(this)} disabled={!this.state.habilitarSinc}>
                                Sincronizar Ventas
                            </button>
                        </span>
                    }
                    <a title="Filtro de ventas" className="btn btn-light ml-1" data-toggle="collapse" href="#collapseFilter" role="button" aria-expanded={this.state.filtroVentas.visible}>
                        <i className="ion-funnel"></i>
                    </a>
                </div>

                <div className={`collapse ${this.state.filtroVentas.visible ? 'show' : ''}`}  id="collapseFilter">
                    <div className="row">
                        <div className="col">
                            <div className="form-group">
                                <label htmlFor="">Status:</label>
                                <select multiple={true} className="form-control" 
                                    value={this.state.filtroVentas.status}
                                    onChange={(e) => {
                                        let vals = [...e.target.options].filter(o => o.selected).map(o => o.value)
                                        this.changeFiltroVentas('status', vals)
                                    }}
                                >
                                    <option value="">Todas</option>
                                    <option value="pendientes">Pendientes</option>
                                    <option value="sincronizadas">Sincronizadas</option>
                                    <option value="error">Con Error</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="col">
                            <div className="form-group">
                                <label htmlFor="">Desde:</label>
                                <ReactDatetime
                                    ref={(picker) => {this.pickerDesde = picker }}
                                    isValidDate={(current) => {
                                        let valid = current.isBefore(moment())
                                        return valid
                                    }}
                                    value={this.state.filtroVentas.desde}
                                    inputProps={{
                                        className:"form-control",
                                        onBlur: () => {
                                            setTimeout(() => this.pickerDesde.closeCalendar(), 550)
                                        }
                                    }}
                                    onChange={(d) => {this.changeFiltroVentas('desde', d)}}
                                 />
                            </div>
                        </div>

                        <div className="col">
                            <div className="form-group">
                            <label htmlFor="">Hasta:</label>
                                <ReactDatetime
                                    ref={(picker) => {this.pickerHasta = picker }}
                                    isValidDate={(current) => {
                                        let valid = current.isBefore(moment())
                                        return valid
                                    }}
                                    value={this.state.filtroVentas.hasta}
                                    inputProps={{
                                        className:"form-control",
                                        onBlur: () => {
                                            setTimeout(() => this.pickerHasta.closeCalendar(), 550)
                                        }
                                    }}
                                    onChange={(d) => {this.changeFiltroVentas('hasta', d)}}
                                 />
                            </div>
                        </div>

                        <div className="col">
                            <div className="form-group">
                            <label htmlFor="">Folio:</label>
                                <input type="text" className="form-control" 
                                    onBlur={(e) => {this.changeFiltroVentas('folio', e.target.value)}} />
                            </div>
                        </div>

                        <div className="col">
                            <div className="form-group">
                            <label htmlFor="">Por pág:</label>
                                <select className="form-control" 
                                    value={this.state.filtroVentas.elemPorPag}
                                    onChange={(e) => {this.changeFiltroVentas('elemPorPag', e.target.value)}} >
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

            	{ Boolean(ventas.length) ?
                    <div>
                    	<table className="table table-condensed vm table-list table-hover table-list clickeable">
                    		<thead>
                    			<tr>
                                    <th style={{width: '35px'}}></th>
                                    <th style={{width: '100px'}}>Sinc.</th>
                                    <th style={{width: '215px'}}>Folio</th>
                    				<th>Fecha</th>
                                    <th>Cliente</th>
                                    <th className="text-right">Monto</th>
                                    <th style={{width: '120px'}}></th>
                    			</tr>
                    		</thead>
                    		<tbody>
                    			{ ventas.map((venta) => {
                                    var seleccionada = this.state.ventasSeleccionadas.indexOf(venta._id) > -1
                    				return ( <tr 
                                        key={`venta-${venta._id}`} 
                                        title={
                                            venta.motivoError ? `Error: ${venta.motivoError}` : (
                                                venta.requiereFactura ? (venta.timbrada ? 'Venta Timbrada' : 'Venta no timbrada') : '')
                                        }
                                        className={`${venta.requiereFactura ? (venta.timbrada ? 'text-success' : 'text-info') : ''} `}
                                        >
                                        <td className="text-center" onClick={() => {
                                            let ventasSeleccionadas = this.state.ventasSeleccionadas
                                            if (seleccionada) {
                                                ventasSeleccionadas.splice(ventasSeleccionadas.indexOf(venta._id), 1)
                                            } else {
                                                ventasSeleccionadas.push(venta._id)
                                            }
                                            this.setState({
                                                ventasSeleccionadas: ventasSeleccionadas
                                            })
                                        }}>
                                            { Boolean(venta.error && !venta.requiereFactura) &&
                                            <span>
                                                 { seleccionada ?
                                                    <i className="ion-ios-circle-filled text-success"></i>
                                                    :
                                                    <i className="ion-ios-circle-outline"></i>
                                                 }
                                             </span>
                                            }
                                        </td>
                                        <td onClick={() => this.props.verVenta(venta, false, {
                                            onSincronizarVenta: (res) => {
                                                this.props.verVenta(null);
                                                this.obtenerVentas(false);
                                            }
                                        })}>
                                        { venta.pendiente &&
                                            <span className="badge badge-warning">Pendiente</span>
                                        }
                                        { !venta.pendiente &&
                                            <span>
                                            {venta.sincronizada ?
                                                <span className="badge badge-success">Si</span>
                                                :
                                                <span className="badge badge-default">Pendiente</span>
                                            }
                                            </span>
                                        }

                                        { venta.error && <span className="badge badge-warning ml-2"><i className="ion-alert"></i></span> }
                                        { venta.entregaDomicilio && <span title="Entrega a domicilio" className="badge badge-info ml-2"><i className="ion-android-car"></i></span> }
                                        </td>
                                        <td onClick={() => this.props.verVenta(venta, false, {
                                            onSincronizarVenta: (res) => {
                                                this.props.verVenta(null);
                                                this.obtenerVentas(false);
                                            }
                                        })}>
                                            <span>{ venta.numero_serie ? (venta.numero_serie + '-' + (venta.folio || '')) : (venta.folio || '') }</span>
                                            {venta.requiereFactura &&
                                                <div style={{lineHeight: 1}}><small className="text-muted">Factura</small></div>
                                            }
                                        </td>
        								<td onClick={() => this.props.verVenta(venta, false, {
                                            onSincronizarVenta: (res) => {
                                                this.props.verVenta(null);
                                                this.obtenerVentas(false);
                                            }
                                        })}>{moment(venta.fecha).format('DD/MM/YYYY HH:mm:ss')}</td>
                                        <td onClick={() => this.props.verVenta(venta, false, {
                                            onSincronizarVenta: (res) => {
                                                this.props.verVenta(null);
                                                this.obtenerVentas(false);
                                            }
                                        })}>{venta.cliente.razon_social}</td>
                                        <td className="text-right font-weight-bold"
                                        onClick={() => this.props.verVenta(venta, false, {
                                            onSincronizarVenta: (res) => {
                                                this.props.verVenta(null);
                                                this.obtenerVentas(false);
                                            }
                                        })}>${formatCurrency(venta.total)}</td>
                                        <td className="text-right">
                                            <button 
                                                onClick={this.handleImprimirVenta.bind(this, venta)} 
                                                title="Imprimir" 
                                                className="btn btn-sm btn-secondary" >
                                                <i className="ion-printer"></i>
                                            </button>
                                            { (!venta.pendiente && (!venta.sincronizada || venta.motivoError) ) && 
                                                <button 
                                                onClick={(e) => {
                                                    if (this[`btn_${venta._id}`]) {
                                                        this[`btn_${venta._id}`].disabled = true
                                                        this.sincronizarVenta(venta._id)
                                                    }
                                                }} 
                                                ref={(btn) => {this[`btn_${venta._id}`] = btn }}
                                                title="Sincronizar" 
                                                className="btn btn-sm btn-info ml-1" >
                                                <i className="ion-ios-paperplane"></i>
                                            </button>
                                            }
                                            { (venta.requiereFactura && venta.urlErrorTimbrado) &&
                                                <button 
                                                    onClick={(e) => {
                                                        let winopts = {
                                                            title: 'Error de timbrado',
                                                            width: 800,
                                                            height: 400
                                                        }
                                                        nw.Window.open(`${venta.urlErrorTimbrado}?as_iframe=1&api_key=${this.props.api_key}`, winopts);
                                                    }} 
                                                    title="Ver error de timbrado" 
                                                    className="btn btn-sm btn-danger ml-1" >
                                                    <i className="ion-alert"></i>
                                                </button>
                                            }
                                        </td>
        							</tr>)
                    			})}
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

                {this.state.mostrarRetiros &&
                    <RetirosEfectivoComponent 
                        handleCerrar={e => {
                            this.setState({mostrarRetiros: false})
                        }}
                        sesionCaja={this.props.sesionCaja}
                        total={this.state.retiros.totalRetirado}
                        retiros={this.state.retiros.objects}>
                    </RetirosEfectivoComponent>
                }

                { modalEditarSerie &&
                <div className="dialog-box modalAutorizacion">
                    <div className="text-primary text-center h5">Cambiar número de serie</div>
                    <div className="text-info text-center text-bold">{ventasSeleccionadas.length} ventas seleccionadas</div>
                    <div className="form-group">
                        <label htmlFor="">Ingrese la nueva serie:</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            ref={(i) => {this.inputCambioSerieInput = i}} 
                            onChange={(e) => {
                                let numero_serie = e.target.value.replace(/[^a-zA-Z]+/, '').toUpperCase()
                                e.target.value = numero_serie
                            }} 
                            onKeyUp={(e) => {
                                if(e.key === 'Enter') {
                                    this.cambiarSerie()
                                }
                            }}
                        autoFocus/>
                    </div>
                    <div className="form-group text-right mt-2">
                        <button className="btn btn-secondary mr-2" onClick={() => {this.setState({modalEditarSerie: null})}} tabIndex="-1">
                            Cancelar
                        </button>
                        <button className="btn btn-primary" onClick={this.cambiarSerie.bind(this)}>
                            Aceptar
                        </button>
                    </div>
                </div>
                }
            </div>
        );
    }
}

const mapStateToProps = state => ({
    ...state.app,
    api_key: state.app.api_key,
    sesionCaja: state.app.usuario.sesion_caja
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
)(Ventas);