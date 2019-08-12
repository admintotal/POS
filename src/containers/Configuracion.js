import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {obtenerAlmacenes, guardarConfiguracion, obtenerConfiguracion} from '../actions';
import * as ImpresorasApi from '../impresoras';
import * as Api from '../api';
import { cargando, mensajeFlash, mostrarAlerta } from '../actions';
import TituloComponent from '../components/TituloComponent';
import IngresoAutorizacionComponent from '../components/IngresoAutorizacionComponent';

class Configuracion extends React.Component {
    constructor(props) {
        super(props)
        
        let bascula = props.bascula || {}
        bascula.baudRate = bascula.baudRate || '115200'
        bascula.messageString = bascula.messageString || 'P'
        this.btnObtenerUltimoFolio = {}
        this.state = {
            ...props,
            almacenes: [],
            puertos: [],
            impresora: props.impresora,
            pinpad: props.pinpad || {},
            habilitarPinpad: props.habilitarPinpad,
            modoKiosko: props.modoKiosko,
            habilitarBascula: props.habilitarBascula,
            habilitarProsepago: props.habilitarProsepago,
            bascula: bascula,
            baudRates: [110, 300, 1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200],
            integracionesPinpad: [
                {id: "banorte", nombre: "Banorte"},
                {id: "santander", nombre: "Santander"},
            ],
            impresoraConfigAvanzada: false,
            autorizadoConfiguracion: props.usuario.autorizaciones.guardar_configuracion_desktop,
        }
    }

    guardar() {
        let data = {...this.state}

        delete data['impresoras']
        delete data['almacenes']
        delete data['puertos']
        delete data['baudRates']

        if (!data.numero_serie || data.numero_serie === "") {
            return this.props.mensajeFlash('error', 'Es necesario especificar una serie.')
        }

        if (!data.folio_inicial || data.folio_inicial === "") {
            return this.props.mensajeFlash('error', 'Es necesario especificar el folio inicial.')
        }

        if (this.state.habilitarPinpad) {
            data.pinpad.magtek = true
            if (! this.validarConfPinpad() ) {
                return this.props.mensajeFlash('error', 'Para guardar complete el formulario de configuración del Pinpad.')
            }
        }
        
        if (data.numero_serie === this.props.numero_serie) {
            delete data['numero_serie']
        }
        
        this.props.guardarConfiguracion(this.props.api_key, data)
    }

    changeBascula(e) {
        let val = e.target.value
        let index = this.state.puertos.findIndex((item) => {
            return item.comName === val
        })
        
        let bascula = index < 0 ? null : this.state.puertos[index]

        this.setState({
            bascula: {...this.state.bascula, ...bascula}
        })
    }

    changeAlmacen(e) {
        if (this.state.sesionCaja) {
            let ci = this.state.configuracion.inventario
            this.props.mensajeFlash('error', `El ${ci.palabra_almacen.toLowerCase()} no será modificado por que hay una sesión de caja abierta.`)
            return false
        }

        let val = e.target.value
        let index = this.state.almacenes.findIndex((item) => {
            return Number(item.id) === Number(val)
        })

        let almacen = index < 0 ? null : this.state.almacenes[index]

        this.setState({
            almacen: almacen
        })
    }
	
    changeImpresora(e) {
        let val = e.target.value
        let index = this.state.impresoras.findIndex((item) => {
            return item.deviceName === val
        })

        let impresora = index < 0 ? null : this.state.impresoras[index]
        this.setState({
            impresora: impresora
        })
    }

    obtenerUltimoFolio(e) {
        if (!this.btnObtenerUltimoFolio) {
            return 
        }

        let originalText = this.btnObtenerUltimoFolio.innerText
        this.btnObtenerUltimoFolio.innerText = "Obteniendo último folio..."
        this.btnObtenerUltimoFolio.disabled = true

        if (this.btnGuardar) {
            this.btnGuardar.disabled = true
        }

        Api.obtenerUltimoFolio(this.props.api_key, this.state.numero_serie).then((res) => {
            if (res.status !== 'success') {
                throw Error('')
            }
            
            if (res.ultimo_folio || res.ultimo_folio === 0) {
                this.setState({
                    folio_inicial: ++res.ultimo_folio
                })
            }

            if (this.btnObtenerUltimoFolio) {
                this.btnObtenerUltimoFolio.innerText = originalText
                this.btnObtenerUltimoFolio.disabled = false
            }

            if (this.btnGuardar) {
                this.btnGuardar.disabled = false
            }
        }).catch((err) => {
            this.props.mensajeFlash('error', `Hubo un error al obtener el último folio.`)

            if (this.btnObtenerUltimoFolio) {
                this.btnObtenerUltimoFolio.innerText = originalText
                this.btnObtenerUltimoFolio.disabled = false
            }

            if (this.btnGuardar) {
                this.btnGuardar.disabled = false
            }
        })
    }

    cargarDatos() {
        Api.obtenerAlmacenes(this.props.api_key).then((res) => {
            this.setState({
                almacenes: res.objects
            })
        })

        Api.obtenerConfiguracion(this.props.api_key).then((conf) => {
            let forzarDescargaProds = conf.forzarDescargaProductosInicioSesion
            if (forzarDescargaProds === undefined) {
                forzarDescargaProds = true
            }

            this.setState({
                folio_inicial: conf.folio_inicial || 1,
                numero_serie: conf.numero_serie,
                habilitarBascula: conf.habilitarBascula,
                terminal: conf.terminal,
                bascula: {...this.state.bascula, ...conf.bascula},
                almacen: conf.almacen,
                impresora: conf.impresora,
                terminales: conf.configuracion.terminales,
                habilitarProsepago: conf.habilitarProsepago,
                habilitarPinpad: conf.habilitarPinpad,
                modoKiosko: conf.modoKiosko,
                mostrarCamposAdicionales: conf.mostrarCamposAdicionales,
                forzarDescargaProductosInicioSesion: forzarDescargaProds,
                mostrarExistenciasAlmacenes: conf.mostrarExistenciasAlmacenes,
                pinpad: {...this.state.pinpad, ...conf.pinpad},
                configuracion: {
                    inventario: conf.configuracion.inventario
                }
            })
        })
            
        Api.obtenerPuertosSeriales(this.props.api_key).then((res) => {
            let puertos = res.objects.sort((a, b) => {
              if (a.comName < b.comName)
                return -1;
              if (a.comName > b.comName)
                return 1;
              return 0;
            })
            
            this.setState({
                puertos: puertos
            })
        })
        .catch((err) => {
            this.props.mensajeFlash('error', `Hubo un error al obtener los puertos seriales.`)
        })


        ImpresorasApi.obtenerImpresoras().then((impresoras) => {
            this.setState({
                impresoras: impresoras
            })
        })
        .catch((err) => {
            this.props.mensajeFlash('error', `Hubo un error al obtener las impresoras.`)
        })
    }

    componentDidMount() {
        if (this.state.autorizadoConfiguracion) {
            this.cargarDatos()
        }
    }

    inicializarPinpad() {
        if (this.validarConfPinpadButton) {
            this.validarConfPinpadButton.disabled = true
        }
        Api.inicializarPinpad(this.props.api_key).then((res) => {
            if (this.validarConfPinpadButton) {
                this.validarConfPinpadButton.disabled = false
            }

            if (res.status === 'error') {
                return this.props.mostrarAlerta({
                    titulo: 'Error de validación',
                    mensaje: res.message || 'Hubo un error al inicializar el pinpad.'
                })
            }
            
            this.props.mostrarAlerta({
                mensaje: res.message
            })
        }).catch((err) => {
            if (this.validarConfPinpadButton) {
                this.validarConfPinpadButton.disabled = false
            }

            return this.props.mostrarAlerta({
                titulo: 'Error',
                mensaje: 'Hubo un error al inicializar el pinpad.'
            })
        })
    }

    validarConfPinpad() {
        let banco = this.state.pinpad.banco.toLowerCase()
        if (banco === 'banorte') {
            return Boolean(this.state.pinpad.banco) && 
                Boolean(this.state.pinpad.noAfiliacion) &&
                Boolean(this.state.pinpad.comName) &&
                Boolean(this.state.pinpad.modeloPinpad) &&
                Boolean(this.state.pinpad.password) &&
                Boolean(this.state.pinpad.usuario)
        }
        if (banco === 'santander') {
            return Boolean(this.state.pinpad.banco) && 
                Boolean(this.state.pinpad.urlPublicKey) &&
                Boolean(this.state.pinpad.url) &&
                Boolean(this.state.pinpad.password) &&
                Boolean(this.state.pinpad.usuario)
        }
    }

    onValidarAutorizacion(valido) {
        this.setState({
            autorizadoConfiguracion: valido
        })

        if (! valido ) {
            this.props.mensajeFlash('error', 'La clave ingresada es incorrecta.')
        } else {
            this.cargarDatos()
        }
    }
    

    render() {
    	let ci = this.state.configuracion ? this.state.configuracion.inventario : {}
        let usuarioAlmacen = this.state.almacen || {}
        let usuarioImpresora = this.state.impresora || {}
    	let usuarioBascula = this.state.bascula || {}

        let autorizadoConfiguracion = this.state.autorizadoConfiguracion

        if (! autorizadoConfiguracion) {
            return (
                <IngresoAutorizacionComponent 
                    titulo="Requiere de autorización para modificar la configuración." 
                    nombreAutorizacion='guardar_configuracion_desktop'
                    api_key={this.props.api_key} 
                    onValidar={this.onValidarAutorizacion.bind(this)}>
                </IngresoAutorizacionComponent>
            )
        }
        
        return (
            <div className="container-fluid">
                <TituloComponent texto="Configuración"></TituloComponent>

                <div className="row">
                    <div className="col-md-6">
                        <fieldset>
                            <div className="form-group">
                                <label htmlFor="">{ci.palabra_almacen || 'Almacén'}:</label>
                                <select className="form-control" onChange={this.changeAlmacen.bind(this)} value={usuarioAlmacen.id}>
                                <option value="">------------</option>
                                { //
                                    this.state.almacenes.map(almacen => {
                                        return (
                                        <option 
                                            value={almacen.id} 
                                            key={`almacen-${almacen.id}`}>
                                            {almacen.nombre}
                                        </option>
                                        )
                                    })
                                }
                                </select>
                            </div>

                            <div className="row">
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label htmlFor="">Serie:</label>
                                        <input
                                            onChange={(e) => {
                                                let numero_serie = e.target.value.replace(/[^a-zA-Z]+/, '').toUpperCase()
                                                this.setState({numero_serie: numero_serie})
                                            }} 
                                            onBlur={(e) => {
                                                this.obtenerUltimoFolio()
                                            }}
                                            value={this.state.numero_serie} 
                                            type="text" 
                                            className="form-control" />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label htmlFor="">Folio inicial:</label>
                                        <input 
                                            onChange={(e) => {this.setState({folio_inicial: e.target.value})}}
                                            value={this.state.folio_inicial} 
                                            type="number" 
                                            min="1"
                                            className="form-control text-right" />
                                        { this.state.numero_serie &&
                                        <button 
                                            ref={(inp) => {this.btnObtenerUltimoFolio = inp}} 
                                            className="btn btn-link btn-sm m-0" 
                                            onClick={this.obtenerUltimoFolio.bind(this)} >
                                            Obtener último folio de la serie {this.state.numero_serie}
                                        </button>
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="form-group mt-2">
                                <label className="control control-checkbox">
                                    Forzar descarga de productos al iniciar sesión
                                    <input 
                                        checked={this.state.forzarDescargaProductosInicioSesion}
                                        onChange={(e) => {this.setState({
                                            forzarDescargaProductosInicioSesion: !this.state.forzarDescargaProductosInicioSesion
                                        })}}
                                        type="checkbox" />
                                    <div className="control_indicator"></div>
                                </label>
                            </div>

                            <div className="form-group mt-2">
                                <label className="control control-checkbox">
                                    Habilitar modo kiosko
                                    <input 
                                        checked={this.state.modoKiosko}
                                        onChange={(e) => {this.setState({
                                            modoKiosko: !this.state.modoKiosko
                                        })}}
                                        type="checkbox" />
                                    <div className="control_indicator"></div>
                                </label>
                            </div>

                            <div className="form-group mt-2">
                                <label className="control control-checkbox">
                                    Habilitar campos adicionales
                                    <input 
                                        checked={this.state.mostrarCamposAdicionales}
                                        onChange={(e) => {this.setState({
                                            mostrarCamposAdicionales: !this.state.mostrarCamposAdicionales
                                        })}}
                                        type="checkbox" />
                                    <div className="control_indicator"></div>
                                </label>
                            </div>

                            <div className="form-group">
                                <label className="control control-checkbox">
                                    Mostar existencias de otros {ci.palabra_almacenes || 'almacenes'}
                                    <input 
                                        checked={this.state.mostrarExistenciasAlmacenes}
                                        onChange={(e) => {this.setState({
                                            mostrarExistenciasAlmacenes: !this.state.mostrarExistenciasAlmacenes
                                        })}}
                                        type="checkbox" />
                                    <div className="control_indicator"></div>
                                </label>
                            </div>
                        </fieldset>

                        <fieldset>
                        { this.state.impresoras ? 
                                <div className="form-group">
                                    <label htmlFor="">Impresora por defecto:</label>
                                    <select value={usuarioImpresora.deviceName || ""} className="form-control" onChange={this.changeImpresora.bind(this)}>
                                        <option value="">------------</option>
                                        { this.state.impresoras.map((impresora) => {
                                            return (
                                                <option 
                                                    key={`impresora-${impresora.deviceName}`}
                                                    value={impresora.deviceName}
                                                    >{impresora.printerName}
                                                </option>
                                            )
                                        })}
                                    </select>
                                    { usuarioImpresora.deviceName &&
                                    <div className="text-right">
                                        <button 
                                            className="btn btn-link btn-sm"
                                            onClick={(e) => {
                                                this.setState({impresoraConfigAvanzada: !this.state.impresoraConfigAvanzada})
                                            }} >
                                            Configuración Avanzada
                                        </button>
                                    </div>
                                    }

                                    { (this.state.impresoraConfigAvanzada) &&
                                    <div className="border-bottom pb-2">
                                        <div className="form-group">
                                            <label className="control control-checkbox">
                                                Habilitar gráficos de fondo
                                                <input 
                                                    checked={this.state.impresora.shouldPrintBackgrounds}
                                                    onChange={(e) => {this.setState({
                                                        impresora: {
                                                            ...this.state.impresora, 
                                                            shouldPrintBackgrounds: !this.state.impresora.shouldPrintBackgrounds
                                                        }
                                                    })}}
                                                    type="checkbox" />
                                                <div className="control_indicator"></div>
                                            </label>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="">Tamaño del papel:</label>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                value={usuarioImpresora.mediaSize}
                                                onChange={(e) => {
                                                    let v = e.target.value.trim()
                                                    this.setState({
                                                        impresora: {
                                                            ...this.state.impresora,
                                                            mediaSize: v
                                                        }
                                                    })
                                                }}
                                            />
                                        </div>
                                    </div>
                                    }
                                </div>
                            : 
                            <div className="alert alert-info">Cargando impresoras</div>
                        }

                        { usuarioImpresora.deviceName &&
                            <div>
                                <div className="form-group">
                                    <label htmlFor="">Márgen izquierdo:</label>
                                    <input type="number" 
                                        className="form-control" 
                                        value={usuarioImpresora.marginLeft || 0} 
                                        onChange={(e) => {
                                            let v = e.target.value
                                            this.setState({
                                                impresora: {
                                                    ...this.state.impresora,
                                                    marginLeft: v
                                                }
                                            })
                                        }} />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="">Ancho del papel en pixeles:</label>
                                    <input type="number" 
                                        className="form-control" 
                                        ref={(inp) => {this.printerPaperLeft = inp}}
                                        value={usuarioImpresora.paperWidth || 250} 
                                        onChange={(e) => {
                                            let v = e.target.value
                                            this.setState({
                                                impresora: {
                                                    ...this.state.impresora,
                                                    paperWidth: v
                                                }
                                            })
                                        }} />
                                </div>
                            </div>
                        }
                        </fieldset>
                    </div>
                    <div className="col-md-6">
                        <fieldset>
                            <div className="form-group">
                                <label className="control control-checkbox">
                                    Habilitar báscula
                                    <input 
                                        checked={this.state.habilitarBascula}
                                        type="checkbox"
                                        onChange={(e) => {this.setState({habilitarBascula: !this.state.habilitarBascula})}}
                                        />
                                    <span className="control_indicator"></span>
                                </label>
                            </div>
                            
                            { this.state.habilitarBascula &&
                                <div className="configuracionBascula mt-2">
                                { this.state.puertos &&
                                    <div>
                                        <div className="form-group">
                                            <label htmlFor="">Seleccionar puerto:</label>
                                            <select value={usuarioBascula.comName || ""} className="form-control" onChange={this.changeBascula.bind(this)}>
                                                <option value="">--------</option>
                                                { this.state.puertos.map((p) => {
                                                    return (
                                                    <option value={p.comName} key={`b-${p.comName}`}>
                                                        {p.comName} {p.pnpId ? ` - ${p.pnpId.slice(0, 30)}` : ''}
                                                    </option>
                                                    )
                                                }) }
                                            </select>
                                        </div> 

                                        <div className="form-group">
                                            <label htmlFor="">Baud rate:</label>
                                            <select 
                                                onChange={(e) => {
                                                    let b = {...usuarioBascula}
                                                    b.baudRate = e.target.value
                                                    this.setState({bascula: b})
                                                }}
                                                className="form-control" 
                                                value={usuarioBascula.baudRate || '115200'}>
                                                { this.state.baudRates.map((i) => {
                                                    return <option value={i} key={`baudRate-${i}`}>{i}</option>
                                                }) }
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="">Mensaje:</label>
                                            <input 
                                                value={usuarioBascula.messageString || 'P'}
                                                onChange={(e) => {
                                                    let b = {...this.state.bascula}
                                                    b.messageString = e.target.value
                                                    this.setState({bascula: b})
                                                }}
                                                type="text" 
                                                className="form-control" />
                                        </div>
                                    </div>
                                }
                                </div>
                            }
                        </fieldset>

                        <fieldset>
                            <div className="form-group">
                                <label className="control control-checkbox">
                                    Habilitar Pinpad 
                                    <input 
                                        checked={this.state.habilitarPinpad}
                                        type="checkbox"
                                        onChange={(e) => {this.setState({habilitarPinpad: !this.state.habilitarPinpad})}}
                                        />
                                    <span className="control_indicator"></span>
                                </label>
                            </div>

                            { this.state.habilitarPinpad && 
                            <div>
                                { (this.state.pinpad.banco && this.state.pinpad.banco.toLowerCase() !== "santander") &&
                                <div className="form-group">
                                    <label className="control control-checkbox">
                                        Habilitar Modo de Pruebas
                                        <input 
                                            checked={this.state.pinpad.modoPruebas}
                                            type="checkbox"
                                            onChange={(e) => {this.setState({
                                                    pinpad: {
                                                        ...this.state.pinpad,
                                                        modoPruebas: !this.state.pinpad.modoPruebas
                                                    }
                                                })
                                            }}
                                            />
                                        <span className="control_indicator"></span>
                                    </label>
                                </div>
                                }

                                { (this.state.pinpad.banco && this.state.pinpad.banco.toLowerCase() === "santander") &&
                                <div>
                                    <div className="form-group">
                                        <label className="control control-checkbox">
                                            Habilitar Log MIT
                                            <input 
                                                checked={Boolean(this.state.pinpad.logMIT)}
                                                type="checkbox"
                                                onChange={(e) => {this.setState({
                                                        pinpad: {
                                                            ...this.state.pinpad,
                                                            logMIT: !Boolean(this.state.pinpad.logMIT)
                                                        }
                                                    })
                                                }}
                                                />
                                            <span className="control_indicator"></span>
                                        </label>
                                    </div>
                                </div>
                                }

                                <div className="form-group">
                                    <label htmlFor="">Banco:</label>
                                    <select value={this.state.pinpad.banco} className="form-control" onChange={(e) => {
                                            this.setState({
                                                pinpad: {
                                                    ...this.state.pinpad,
                                                    banco: e.target.value
                                                }
                                            })
                                        }}>
                                        <option value="">------</option>
                                        <option value="Banorte">Banorte</option>
                                        <option value="santander">Santander</option>
                                    </select>
                                </div>

                                { (this.state.pinpad.banco && this.state.pinpad.banco.toLowerCase() === "santander") &&
                                <div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="">Ambiente:</label>
                                        <select 
                                            value={this.state.pinpad.url}
                                            className="form-control"
                                            onChange={(e) => {
                                                let ambiente = e.target.value
                                                let p = {...this.state.pinpad}
                                                p.url = ambiente
                                                if (p.url === 'https://qa3.mitec.com.mx')
                                                {
                                                    p.urlPublicKey = "https://qa10.mitec.com.mx";
                                                }
                                                else if (p.url === 'https://ssl.e-pago.com.mx')
                                                {
                                                    p.urlPublicKey = "https://key.mitec.com.mx";
                                                }
                                                else if (p.url === 'https://bc.mitec.com.mx')
                                                {
                                                    p.urlPublicKey = "https://key.mitec.com.mx";
                                                }
                                                else if (p.url === 'https://vip.e-pago.com.mx')
                                                {
                                                    p.urlPublicKey = "https://key.mitec.com.mx";
                                                }
                                                else if (p.url === 'https://vip2.e-Pago.com.mx')
                                                {
                                                    p.urlPublicKey = "https://key.mitec.com.mx";
                                                }

                                                this.setState({pinpad: p})

                                            }}
                                        >
                                            <option value="">----</option>
                                            <option value="https://qa3.mitec.com.mx">https://qa3.mitec.com.mx</option>
                                            <option value="https://ssl.e-pago.com.mx">https://ssl.e-pago.com.mx</option>
                                            <option value="https://bc.mitec.com.mx">https://bc.mitec.com.mx</option>
                                            <option value="https://vip.e-pago.com.mx">https://vip.e-pago.com.mx</option>
                                            <option value="https://vip2.e-Pago.com.mx">https://vip2.e-Pago.com.mx</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="">Usuario:</label>
                                        <input 
                                            type="text" 
                                            className="form-control"
                                            value={this.state.pinpad.usuario}
                                            onChange={(e) => {
                                                let p = {...this.state.pinpad}
                                                p.usuario = e.target.value.trim()
                                                this.setState({pinpad: p})
                                            }}
                                         />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="">Contraseña:</label>
                                        <input 
                                            type="password" 
                                            value={this.state.pinpad.password}
                                            className="form-control"
                                            onChange={(e) => {
                                                let p = {...this.state.pinpad}
                                                p.password = e.target.value.trim()
                                                this.setState({pinpad: p})
                                            }}
                                         />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="">Modelo del pinpad:</label>
                                        <select 
                                            className="form-control"
                                            value={this.state.pinpad.modeloPinpad}
                                            onChange={(e) => {
                                                let p = {...this.state.pinpad}
                                                p.modeloPinpad = e.target.value
                                                this.setState({pinpad: p})
                                            }}>
                                            <option value="">------</option>
                                            <option value="Vx810">Vx810</option>
                                            <option value="Vx820">Vx820</option>
                                        </select>
                                    </div>

                                    {(this.validarConfPinpad()) &&
                                        <div className="text-right">
                                            <button ref={(input) => {this.validarConfPinpadButton = input}} className="btn btn-link" onClick={this.inicializarPinpad.bind(this)}>Validar Configuración</button>
                                        </div>
                                    }
                                </div>
                                }
                                { (this.state.pinpad.banco && this.state.pinpad.banco.toLowerCase() === "banorte") &&
                                <div>
                                    <div className="alert alert-info p-2 mt-2 mb-1">
                                        Asegúrese de contar con la instalación de <b>Java SE Runtime Environment (x86)</b> y el controlador del pinpad proporcionado por <b>Banorte</b>.
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="">No. Afiliación:</label>
                                        <input 
                                            type="text" 
                                            className="form-control"
                                            value={this.state.pinpad.noAfiliacion}
                                            onChange={(e) => {
                                                let p = {...this.state.pinpad}
                                                p.noAfiliacion = e.target.value.trim()
                                                this.setState({pinpad: p})
                                            }}
                                         />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="">Usuario:</label>
                                        <input 
                                            type="text" 
                                            className="form-control"
                                            value={this.state.pinpad.usuario}
                                            onChange={(e) => {
                                                let p = {...this.state.pinpad}
                                                p.usuario = e.target.value.trim()
                                                this.setState({pinpad: p})
                                            }}
                                         />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="">Contraseña:</label>
                                        <input 
                                            type="password" 
                                            value={this.state.pinpad.password}
                                            className="form-control"
                                            onChange={(e) => {
                                                let p = {...this.state.pinpad}
                                                p.password = e.target.value.trim()
                                                this.setState({pinpad: p})
                                            }}
                                         />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="">Modelo del pinpad:</label>
                                        <select 
                                            className="form-control"
                                            value={this.state.pinpad.modeloPinpad}
                                            onChange={(e) => {
                                                let p = {...this.state.pinpad}
                                                p.modeloPinpad = e.target.value
                                                this.setState({pinpad: p})
                                            }}>
                                            <option value="">------</option>
                                            <option value="Vx810">Vx810</option>
                                            <option value="Vx820">Vx820</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="">Puerto PinPad:</label>
                                        <select 
                                            value={this.state.pinpad.comName || ""} 
                                            className="form-control" 
                                            onChange={(e) => {
                                                    let p = {...this.state.pinpad}
                                                    p.comName = e.target.value
                                                    this.setState({pinpad: p})
                                            }}>
                                            <option value="">--------</option>
                                            { this.state.puertos.map((p) => {
                                                return (
                                                <option value={p.comName} key={`pp-${p.comName}`}>
                                                    {p.comName} {p.manufacturer ? ` - ${p.manufacturer.slice(0, 30)}` : ''}
                                                </option>
                                                )
                                            }) }
                                        </select>
                                    </div>

                                    {(this.validarConfPinpad()) &&
                                        <div className="text-right">
                                            <button ref={(input) => {this.validarConfPinpadButton = input}} className="btn btn-link" onClick={this.inicializarPinpad.bind(this)}>Validar Configuración</button>
                                        </div>
                                    }
                                </div>
                                }
                            </div>
                            }
                        </fieldset>
                    </div>
                </div>

                <div className="row mb-3">
                    <div className="col-md-12">
                        <hr/>
                    </div>
                    <div className="col-md-12 text-right">
                        <button ref={(btn) => this.btnGuardar = btn} className="btn btn-primary" onClick={this.guardar.bind(this)}>Guardar</button>
                    </div>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    usuario: state.app.usuario,
    numero_serie: state.app.configuracion.numero_serie,
    folio_inicial: state.app.configuracion.folio_inicial,
    api_key: state.app.api_key,
    configuracion: state.app.configuracion,
    sesionCaja: state.puntoVenta.sesionCaja
})

const mapDispatchToProps = dispatch => bindActionCreators({
	obtenerAlmacenes,
    guardarConfiguracion,
    obtenerConfiguracion,
    mensajeFlash,
    mostrarAlerta,
    cargando
}, dispatch)

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Configuracion)