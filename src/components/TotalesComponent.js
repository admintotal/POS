import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import formatCurrency from 'format-currency';

class TotalesComponent extends React.Component {
    render() {
        return (
            <table className="table totales mb-0">
				<tbody>
					<tr>
						<th>Total Artículos:</th>
						<td className="text-right">{formatCurrency(this.props.totalArticulos)}</td>
					</tr>
					<tr>
						<th>Total Desc:</th>
						<td className="text-right">${formatCurrency(this.props.totalDescuento)}</td>
					</tr>
					<tr className="total">
						<th>Total:</th>
						<td className="text-right">${formatCurrency(this.props.total)}</td>
					</tr>
					{ Boolean(this.props.aCobrar !== undefined) &&
					<tr className="aCobrar font-weight-bold">
						<th>A Cobrar:</th>
						<td className="text-right">${formatCurrency(this.props.aCobrar)}</td>
					</tr>
					}
					{ Boolean(this.props.cambio !== undefined) &&
					<tr className="cambio">
						<th>Cambio:</th>
						<td className="text-right">${formatCurrency(this.props.cambio)}</td>
					</tr>
					}
				</tbody>
			</table>
        );
    }
}

const mapStateToProps = state => ({
	
});

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TotalesComponent);