import React from 'react';
import logo from '../assets/logo.png';
import { Link } from 'react-router-dom';
import {toggleSidebar} from '../actions';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import moment from 'moment';
import SideBarMenuComponent from './SideBarMenuComponent';

moment.locale('es')

const Header = ({showSidebar, toggleSidebar, sesionCaja, actualizacionDisponible, statusActualizacion}) => (
    <div>
        <div className='headerWrapper'>
            <button onClick={toggleSidebar} className="toggleMainMenu">
              { !showSidebar ? 
                <i className="ion-navicon"></i> :
                <i className="ion-close-round"></i>
              }
            </button>
            <div className="right-items">
              { sesionCaja &&
                <Link className="sesionCaja text-success" to="/sesion-caja" onClick={showSidebar ? toggleSidebar : null}>
                  Caja activa desde <b>{moment(sesionCaja.fecha).from(moment())}</b>
                </Link>
              }
              { sesionCaja &&
                <Link title="Cerrar Sesión de Caja" className="sesionCaja text-danger" to="/sesion-caja" onClick={showSidebar ? toggleSidebar : null}>
                  <i className="ion-power"></i>
                </Link>
              }
              { actualizacionDisponible &&
                <Link className="actualizacion" to="/actualizaciones" onClick={showSidebar ? toggleSidebar : null}>
                  { Boolean(statusActualizacion) ?
                    <div><i className="ion-flag"></i> {statusActualizacion.status} actualización...</div>
                    :
                    <div><i className="ion-flag"></i> Actualización Disponible</div>
                  }
                </Link>
              }
            </div>
            <div className='logoWrapper'>
                <img src={logo} alt="Logo" />
            </div>
        </div>
        { showSidebar && 
          <SideBarMenuComponent></SideBarMenuComponent>
        }
    </div>
);


const mapStateToProps = state => ({
    ...state.app,
    almacen: state.app.configuracion.almacen,
    sesionCaja: state.puntoVenta ? state.puntoVenta.sesionCaja : null
});

const mapDispatchToProps = dispatch => bindActionCreators({toggleSidebar}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Header);
