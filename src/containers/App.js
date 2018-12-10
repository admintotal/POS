import React from 'react';
import Header from '../components/Header';
import Login from '../components/Login';
import AlertaComponent from '../components/AlertaComponent';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { obtenerUltimaSesion, mensajeError, mensajeSuccess, logoutUsuario } from '../actions';
import PropTypes from 'prop-types';
import {shortcutManager} from '../index';
import VentaComponent from '../components/VentaComponent';
import RecepcionPagoComponent from '../components/RecepcionPagoComponent';

import '../assets/ionicons/css/ionicons.min.css';
import './App.css';

class App extends React.Component {
    getChildContext() {
        return { shortcuts: shortcutManager }
    }

    componentDidMount() {
        this.props.obtenerUltimaSesion()
    }

    ocultarMensaje(tipo) {
        if (tipo === 'error') {
            this.props.mensajeError(null)
        } else{
            this.props.mensajeSuccess(null)
        }
    }

    render() {
        const {
            authenticated, 
            children, 
            cargando, 
            error, 
            flash_success,
            mensajeAlerta,
            venta,
            recepcionPago
        } = this.props;
        
        return (
            <div className="App noselect">
                { mensajeAlerta && <AlertaComponent {...mensajeAlerta}></AlertaComponent>}
                { Boolean(venta) && <VentaComponent {...venta}></VentaComponent>}
                { Boolean(recepcionPago) && <RecepcionPagoComponent {...recepcionPago}></RecepcionPagoComponent>}
                <div className={`cargando ${cargando ? ' visible ': ''}`}>Cargando...</div>
                {error && <div className="flash-message mensajeError" onClick={() => {this.ocultarMensaje('error') }}>{error}</div>}
                {flash_success && <div className="flash-message mensajeSuccess" onClick={() => {this.ocultarMensaje('success') }}>{flash_success}</div>}
                
                { authenticated ? 
                    <div>
                        <Header/>
                        <div className="appContent">
                            <input type="password" name="_pass" className="tricky-pass" />
                            {children}
                        </div>
                    </div>
                    :
                    <Login />
                }
            </div>
        );
    }
}

App.childContextTypes = {
    shortcuts: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
    ...state.app
});

const mapDispatchToProps = dispatch => bindActionCreators({obtenerUltimaSesion, mensajeError, mensajeSuccess, logoutUsuario}, dispatch);
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);

