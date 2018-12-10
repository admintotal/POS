import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { ocultarAlerta } from '../actions';
import sanitizeHtml from 'sanitize-html';

class AlertaComponent extends React.Component {
	focusElement = null

    sanitizeHtmlConf = {
        allowedTags: false,
        allowedAttributes: false,
    }

	componentWillUnmount() {
		if (this.focusElement) {
			this.focusElement.focus()
		}
	}

	componentDidMount() {
		this.focusElement = document.activeElement
		if (this.focusElement) {
			this.focusElement.blur()
		}

        if (this.acpetar_input) {
            this.acpetar_input.focus()
        }
	}

    render() {
        return (
            <div className="alert-dialog">
            	<div className="overlay"></div>
            	<div className="box">
            		<h3 className="titulo">{this.props.titulo || 'Alerta del sistema'}</h3>
            		
            		<div className="mensaje" dangerouslySetInnerHTML={{__html: sanitizeHtml(this.props.mensaje, this.sanitizeHtmlConf)}} />

            		<div className="text-right">
            			<hr/>
                        { this.props.cancelable &&
                            <button ref={(input) => {this.acpetar_input = input}} className="btn btn-secondary mr-2" onClick={e => {
                                if (this.props.handleCancelar) {
                                    this.props.handleCancelar()
                                }

                                this.props.ocultarAlerta()
                            }}>
                                {this.props.cancelarTxt || 'Cancelar'}
                            </button>
                        }

            			<button ref={(input) => {this.acpetar_input = input}} className="btn btn-primary" onClick={e => {
                            if (this.props.handleAceptar) {
                                this.props.handleAceptar()
                            }
                            this.props.ocultarAlerta()
                        }}>
            				{this.props.aceptarTxt || 'Aceptar'}
            			</button>
            		</div>
            	</div>
            </div>
        );
    }
}

const mapStateToProps = state => ({
	
});

const mapDispatchToProps = dispatch => bindActionCreators({ocultarAlerta}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AlertaComponent);