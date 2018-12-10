import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

class Paginador extends React.Component {

	fetchUrl(url) {
		let options = {
	      method: 'GET'
	  	}
	  	let cb = this.props.onResult
	  	let prefijo = this.props.prefijo
		fetch(url, options).then((res) => {
		    res.json().then((json) => {
		    	if (cb) {
					cb(json, prefijo)
		    	}
		    })
	
		}, (err) => {
		    
		});
	}

    render() {
        return (
        	<div style={{height: '50px'}}>
	        	<div className={`paginador-container ${this.props.relative ? 'relative' : ''}`}>
		            <nav>
					  <ul className="pagination m-0">
					    <li className="page-item">
					      <a className="page-link">
					        <span>&laquo;</span>
					        <span className="sr-only">Previous</span>
					      </a>
					    </li>
					    { this.props.paginas.map((p, i) => {
					    	if (+this.props.paginaActual === +i + 1) {
						    	return <li className="page-item active" key={`pagelink-${i}`}>
						    		<a className="page-link" >{i + 1}</a>
						    	</li>
					    	} else {
					    		return <li className="page-item" key={`pagelink-${i}`}>
						    		<a className="page-link" onClick={this.fetchUrl.bind(this, p)}>{i + 1}</a>
						    	</li>
					    	}
					    	
					    })}
					    <li className="page-item">
					      <a className="page-link">
					        <span>&raquo;</span>
					        <span className="sr-only">Next</span>
					      </a>
					    </li>
					  </ul>
					</nav>
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
)(Paginador);