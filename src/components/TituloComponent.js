import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

class TituloComponent extends React.Component {
    render() {
        return (
            <div className='page-title text-info'>{this.props.texto || 'Título no especificado.'}</div>
        );
    }
}

const mapStateToProps = state => ({
	
});

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TituloComponent);