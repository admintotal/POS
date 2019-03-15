import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import moment from 'moment';
import ReactDatetime from 'react-datetime';
import '../../node_modules/react-datetime/css/react-datetime.css';
import { mensajeFlash } from '../actions';
import { getHorasEntrega } from '../helpers';

class FechaEntregaComponent extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			fecha: props.fecha,
			horaA: props.horaA,
			horaB: props.horaB
		}
	}

	onAceptar() {
		if (!this.state.fecha) {
			return this.props.mensajeFlash('error', 'Especifique una fecha de entrega')
		}

		if (!this.state.horaA) {
			this.horaA.focus()
			return this.props.mensajeFlash('error', 'Especifique el horario de entrega.')
		}

		if (!this.state.horaB) {
			this.horaB.focus()
			return this.props.mensajeFlash('error', 'Especifique el horario de entrega.')
		}

		this.props.handleAceptar({
			...this.state,
			fecha: this.state.fecha
		})
	}

    render() {
    	let opciones_hora = getHorasEntrega()
    	
        return (
	        <div className="dialog-box">
				<h4 class="text-primary text-center h5">Fecha de Entrega</h4>
	            <div className="form-group">
	                <label htmlFor="">Fecha:</label>
	                <ReactDatetime
	                	value={this.state.fecha}
	                    ref={(picker) => {this.pickerFecha = picker }}
	                    isValidDate={(current) => {
	                        return current.isAfter(moment())
	                    }}
	                    timeFormat={false}
	                    inputProps={{
	                        className:"form-control",
	                        onBlur: () => {
	                            setTimeout(() => this.pickerFecha.closeCalendar(), 550)
	                        }
	                    }}
	                    onChange={(date) => {
	                    	if (!date || (typeof date === "string" && date !== "")) {
				                return 
				            }

	                    	this.setState({
	                    		fecha: date.format("YYYY-MM-DD")
	                    	})
	                    }}
	                 />
	            </div>

	            <div className="row">
	            	<div className="col">
	            		<div className="form-group">
	            			<label htmlFor="">De:</label>
	            			<select 
		            			className="form-control"
		            			ref={(input) => {this.horaA = input }}
		            			value={this.state.horaA}
		            			onChange={(ev) => {
			                    	this.setState({
			                    		horaA: ev.target.value
			                    	})
			                    }}
	            			>
	            				<option value=''>---</option>
	            				{ opciones_hora.map(function(o) {
	            					return (<option key={`horaA-${o.id}`} value={o.id}>{o.texto}</option>)
	            				})}
	            			</select>
	            		</div>
	            	</div>
	            	<div className="col">
	            		<div className="form-group">
	            			<label htmlFor="">A:</label>
	            			<select 
	            				value={this.state.horaB}
	            				ref={(input) => {this.horaB = input }}
	            				className="form-control"
	            				onChange={(ev) => {
			                    	this.setState({
			                    		horaB: ev.target.value
			                    	})
			                    }}
	            			>
	            			<option value=''>---</option>
	            				{ opciones_hora.map(function(o) {
	            					return (<option key={`horaB-${o.id}`} value={o.id}>{o.texto}</option>)
	            				})}
	            			</select>
	            		</div>
	            	</div>
	            </div>

	                                   
	            <div className="form-group text-right">
	                <button className="btn btn-light" onClick={this.props.handleCancelar}>Cancelar</button>
	                <button className="btn btn-primary" onClick={this.onAceptar.bind(this)}>Aceptar</button>
	            </div>
	        </div>
        );
    }
}

const mapStateToProps = state => ({
	
});

const mapDispatchToProps = dispatch => bindActionCreators({mensajeFlash}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(FechaEntregaComponent);