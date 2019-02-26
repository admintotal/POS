import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import VersionComponent from './VersionComponent';
import {toggleSidebar, logoutUsuario} from '../actions';

class SideBarMenuComponent extends React.Component {
    constructor(props) {
      super(props)
      this.state = {}
    }
    render() {
        let configuracion = this.props.configuracion
        let usuario = this.props.usuario
        let almacen = this.props.almacen
        let toggleSidebar = this.props.toggleSidebar
        let logoutUsuario = this.props.logoutUsuario

        return (
            <div className="sidebarMenu">
                <div className="infoUsuario">
                  <div className="nombreUsuario">{usuario.username}</div>
                  <Link onClick={toggleSidebar} className="claveCliente" to="/configuracion">
                    {configuracion.general.clave} <i className="ion-ios-gear"></i>
                  </Link>
                  { almacen && 
                    <span className="badge badge-info badge-sm pull-right">
                      {configuracion.inventario.palabra_almacen} {almacen.nombre}
                    </span>
                  }
                </div>
                <ul>
                  <li><Link onClick={toggleSidebar} className="navItem" to="/inicio">Inicio</Link></li>
                  <li><Link onClick={toggleSidebar} className="navItem" to="/mis-ventas">Ventas</Link></li>
                  { configuracion.habilitarPinpad &&
                    <li><Link onClick={toggleSidebar} className="navItem" to="/transacciones-pinpad">Transacciones Pinpad</Link></li>
                  }
                  <li><Link onClick={toggleSidebar} className="navItem" to="/punto-venta">Punto de Venta</Link></li>
                  <li><Link onClick={toggleSidebar} className="navItem" to="/recepciones-pago">Recepciones de Pago</Link></li>
                  { Boolean(usuario.permisos && usuario.permisos.pedido_cliente) && 
                    <li><Link onClick={toggleSidebar} className="navItem" to="/pedidos">Pedidos</Link></li>
                  }
                  { Boolean(usuario.autorizaciones.guardar_configuracion_desktop) &&
                  <li>
                    <a onClick={() => {
                      this.setState({
                        visibleSubmenuCatalogos: !this.state.visibleSubmenuCatalogos
                      })
                    }} className={`navItem ${this.state.visibleSubmenuCatalogos ? 'active' : ''}`}>Catálogos</a>
                    
                    <div className={`submenu ${this.state.visibleSubmenuCatalogos ? '' : 'd-none'}`} >
                      <Link onClick={toggleSidebar} className="navItem" to="/productos">Productos</Link>
                      <Link onClick={toggleSidebar} className="navItem" to="/clientes">Clientes</Link>
                    </div>
                  </li>
                  }
                  <li><Link onClick={toggleSidebar} className="navItem" to="/sincronizaciones">Sincronizaciones</Link></li>
                  <li><Link onClick={toggleSidebar} className="navItem" to="/actualizaciones">Actualizaciones</Link></li>
                  <li><a className="navItem" onClick={(ev) => {logoutUsuario(configuracion.general.clave, usuario.api_token)}}>Salir</a></li>
                </ul>
                <VersionComponent></VersionComponent>
            </div> 
        );
    }
}

const mapStateToProps = state => ({
    ...state.app,
    almacen: state.app.configuracion.almacen,
    sesionCaja: state.puntoVenta ? state.puntoVenta.sesionCaja : null
});

const mapDispatchToProps = dispatch => bindActionCreators({toggleSidebar, logoutUsuario}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SideBarMenuComponent);