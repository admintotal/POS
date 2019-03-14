import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { mostrarAlerta } from '../actions';

class DireccionesEntregaSelectComponent extends React.Component {

    render() {
        let direcciones = this.props.direcciones || []
        return (
            <select onChange={(ev) => {this.props.onChange(ev.target.value)}} className="form-control" value={this.props.value}>
                <option value="">Mismo Lugar</option>
                { direcciones.map((direccion) => {
                    return (
                        <option value={direccion.id} key={`de-${direccion.id}`}>
                            {direccion.nombre ? direccion.nombre : direccion.direccion_completa}
                        </option>
                    )
                })}
            </select>
        );
    }
}

const mapStateToProps = state => ({
	
});

const mapDispatchToProps = dispatch => bindActionCreators({mostrarAlerta}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DireccionesEntregaSelectComponent);