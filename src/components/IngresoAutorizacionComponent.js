import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as Api from '../api';

class IngresoAutorizacionComponent extends React.Component {
	constructor(props) {
		super(props)
		this.state = {

		}
	}

	validarAutorizacion() {
        let clave = this.clave_autorizacion_input ? this.clave_autorizacion_input.value : ''
        let data = {clave: clave.trim(), autorizacion: this.props.nombreAutorizacion}
        return Api.validarAutorizacion(this.props.api_key, data)
        .then((response) => {
            this.props.onValidar(response.autorizado)
        })
    }

    componentDidMount() {
    	if (this.clave_autorizacion_input) {
    		this.clave_autorizacion_input.select()
    	}
    }

    render() {
        return (
	        <div className="container-fluid">
	            <div className="row justify-content-center mt-5">
	                <div className={this.props.colCssClass === undefined ? "col-md-6" : this.props.colCssClass}>
	                    <h4 class="text-center text-primary">{this.props.titulo || 'Para continuar ingrese una clave de autorización.'}</h4>
	                    <fieldset>
	                        <div className="form-group">
	                            <label title={`La autorización requerida es: ${this.props.nombreAutorizacion}`} htmlFor="">Clave de Autorización:</label>
	                            <input 
	                                ref={(inp) => {this.clave_autorizacion_input = inp}}  
	                                type="password" 
	                                className="form-control input-lg" 
	                                autocomplete="off"
	                                onKeyUp={(e) => {
	                                    if(e.key === 'Enter') {
	                                        this.validarAutorizacion()
	                                    }
	                                }}
	                             />
	                        </div>

	                        { this.props.nombreAutorizacion &&
	                        <div>
	                        	({this.props.nombreAutorizacion})
	                        </div>
	                        }
	                        
	                        <div className="form-group text-right">
	                        	{Boolean(this.props.onCancelar) &&
	                            <button className="btn btn-default" onClick={this.props.onCancelar}>Cancelar</button>
	                        	}
	                            <button className="btn btn-primary" onClick={this.validarAutorizacion.bind(this)}>Autorizar</button>
	                        </div>
	                    </fieldset>
	                </div>
	            </div>
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
)(IngresoAutorizacionComponent);