import React from 'react';
import formatCurrency from 'format-currency';

export const MenuAutocompleteView = function(items, value, style) {
  return (
    <div className="autocompleteMenu" style={{ ...style }} children={items}/>
  );
} 

export const ClienteAutocompleteView = function(item, isHighlighted) {
  let extraCss = isHighlighted ? 'active' : '';
  return (
    <div className={`autocomplete-item ${extraCss} _acCliente`} key={`acCliente-${item.id}`} >
      <div>{item.razon_social}</div>
    </div>
  );
} 

export const BancoAutocompleteView = function(item, isHighlighted) {
  let extraCss = isHighlighted ? 'active' : '';
  return (
    <div className={`autocomplete-item ${extraCss} _acBanco`} key={`banco-${item.nombre}`} >
      <div>{item.nombre}</div>
    </div>
  );
} 

export const ProductoAutocompleteView = function(item, isHighlighted) {
  let extraCss = isHighlighted ? 'active' : '';
  return (
    <div className={`autocomplete-item ${extraCss} _acProducto`} key={`acProducto-${item.id}`}>
        <div className="row align-items-center">
            <div className="col-8">
                <b>{item.codigo}</b> {item.descripcion} 
                
            </div>
            <div className="col text-right">
              <div>Precio Neto:</div>
              <b>${formatCurrency(item.precio_neto)}</b>
            </div>
        </div>
    </div>
  );
} 