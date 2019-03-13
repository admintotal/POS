import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import pjson from '../../package.json'
import { mostrarAlerta } from '../actions';

class VersionComponent extends React.Component {
	showAppVersions(e) {
        this.props.mostrarAlerta({
            titulo: `Admintotal Desktop v${pjson.version}`, 
            mensaje: `
                <div class="text-center text-muted">
                    <div>_node: <b>${process.versions['node']}</b></div>
                    <div>_nw: <b>${process.versions['node-webkit']}</b></div>
                    <div>_nw-flavor: <b>${process.versions['nw-flavor']}</b></div>
                    <div>_v8: <b>${process.versions['v8']}</b></div>
                    <div>_env: <b>${process.env.NODE_ENV}</b></div>
                </div>
            `
        })
	}

    render() {
        return (
            <div className="version-box" style={this.props.customStyles || {}}>
              Admintotal <span onDoubleClick={this.showAppVersions.bind(this)}>v{pjson.version}</span>
            </div>
        );
    }
}

const mapStateToProps = state => ({
	
});

const mapDispatchToProps = dispatch => bindActionCreators({mostrarAlerta}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(VersionComponent);