import React from 'react';
import { Switch, Route } from 'react-router';
import App from './containers/App';
import PuntoVenta from './containers/PuntoVenta';
import SesionCaja from './containers/SesionCaja';
import RetirarEfectivo from './containers/RetirarEfectivo';
import Sincronizaciones from './containers/Sincronizaciones';
import Configuracion from './containers/Configuracion';
import Pedidos from './containers/Pedidos';
import Actualizaciones from './containers/Actualizaciones';
import Ventas from './containers/Ventas';
import Home from './containers/Home';
import VerificadorPrecios from './containers/VerificadorPrecios';
import ReporteDetallado from './containers/ReporteDetallado';
import ConsultaTransacciones from './containers/ConsultaTransacciones';
import RecepcionPago from './containers/RecepcionPago';
import RecepcionesPago from './containers/RecepcionesPago';
import Productos from './containers/Productos';
import Clientes from './containers/Clientes';
import TransaccionesPinpad from './containers/TransaccionesPinpad';
import CargarRespaldo from './containers/CargarRespaldo';
import PedidoFormComponent from './components/PedidoFormComponent';

export default () => (
  <App>
    <Switch>
      <Route path="/inicio" component={Home} />
      <Route path="/mis-ventas" component={Ventas} />
      <Route path="/punto-venta" component={PuntoVenta} exact={true} />
      <Route path="/punto-venta/:id" component={PuntoVenta} />
      <Route path="/pedidos" component={Pedidos} />
      <Route path="/pedido" component={PedidoFormComponent} exact={true} />
      <Route path="/pedido/:id" component={PedidoFormComponent} />
      <Route path="/sesion-caja" component={SesionCaja} />
      <Route path="/sincronizaciones" component={Sincronizaciones} />
      <Route path="/configuracion" component={Configuracion} />
      <Route path="/actualizaciones" component={Actualizaciones} />
      <Route path="/retiro-efectivo" component={RetirarEfectivo} />
      <Route path="/recepciones-pago" component={RecepcionesPago} />
      <Route path="/recepcion-pago" component={RecepcionPago} />
      <Route path="/verificador-precios" component={VerificadorPrecios} />
      <Route path="/consulta-transacciones-pinpad" component={ConsultaTransacciones} />
      <Route path="/reportes/:tipo/:id" component={ReporteDetallado} />
      <Route path="/productos" component={Productos} />
      <Route path="/transacciones-pinpad" component={TransaccionesPinpad} />
      <Route path="/cargar-respaldo" component={CargarRespaldo} />
      <Route path="/clientes" component={Clientes} />
    </Switch>
  </App>
);
