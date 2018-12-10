import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {submitLoginAction} from '../actions';
import logo from '../assets/logo.png';
import VersionComponent from './VersionComponent';


class Login extends React.Component {

    onSubmit(e) {
        e.preventDefault();

        let data = {
            claveCliente: this.claveCliente.value.replace(/ /g, '').replace(/\./g, '').toLowerCase().trim(),
            usuario: this.usuario.value,
            password: this.password.value,
        }
        
        this.props.submitLoginAction(data);
    }

    componentDidMount() {
        setTimeout(() => {
            if (this.claveCliente) {
                this.claveCliente.focus()
            }
        }, 100)
    }

    render() {
        return (
            <div>
                <div className="loginHeader">
                    <img src={logo} alt="Logo" />
                </div>
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-md-8">
                            {this.props.errorValidacion && 
                            <div className="alert alert-danger">
                                {this.props.errorValidacion}
                            </div>
                            }
                            <form onSubmit={this.onSubmit.bind(this)} className="form">
                                <input style={{display:"none"}} type="text" name="fakeusernameremembered"/>
                                <input style={{display:"none"}} type="password" name="fakepasswordremembered"/>

                                <div className="form-group">
                                    <label htmlFor="">Cliente:</label>
                                    <div className="input-group-append">
                                        <input required ref={(input) => { this.claveCliente = input; }} type="text" className="form-control" />
                                        <span style={{borderRadius: '1px', borderLeft: 0}} className="input-group-text">admintotal.com</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="">Usuario:</label>
                                    <input required ref={(input) => { this.usuario = input; }} type="text" className="form-control" />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="">Contraseña:</label>
                                    <input required ref={(input) => { this.password = input; }} type="password" className="form-control" />
                                </div>
                                <div className="form-group text-right">
                                    <hr/>
                                    <input type="submit" className="btn btn-primary" value="Enviar" />
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <VersionComponent customStyles={{backgroundColor: 'transparent', color: '#848484'}}></VersionComponent>
            </div>
        )
    }
    
}

const mapStateToProps = state => ({
    errorValidacion: state.app.errorValidacion,
});

const mapDispatchToProps = dispatch => bindActionCreators({submitLoginAction}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Login);

