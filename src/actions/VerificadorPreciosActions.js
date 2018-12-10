import * as action from '../constants/ActionTypes';

export function autocompleteProducto(api_key, q, almacen) {
  return {
    type: action.CP_AUTOCOMPLETE_PRODUCTO,
    q: q,
    api_key: api_key,
    almacen: almacen
  }
}
