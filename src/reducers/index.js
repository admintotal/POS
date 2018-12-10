import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';
import app from './app';
import puntoVenta from './puntoVenta';
import pedidos from './pedidos';
import verificadorPrecios from './verificadorPrecios';
import recepcionesPago from './recepcionesPago';

const rootReducer = combineReducers({
  app,
  puntoVenta,
  pedidos,
  verificadorPrecios,
  recepcionesPago,
  routing: routerReducer,
});

export default rootReducer;
