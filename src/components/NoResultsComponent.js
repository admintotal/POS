import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

class NoResultsComponent extends React.Component {
    render() {
        return (
            <div className="section-empty">
                <i className="ion-ios-filing-outline h1"></i>
                <div className="msg">{this.props.msg || 'No hay datos que mostrar.'}</div>
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
)(NoResultsComponent);