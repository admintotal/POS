//#r "System.Xml.dll"
//#r "System.Xml.Linq.dll"

using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using cpIntegracionEMV;
using System.Net;
using System.Xml;
using Newtonsoft.Json;

public class Proxy
{
    public Func<object, Task<object>> Inicializar;
    public Func<object, Task<object>> RealizarCobro;
    public Func<object, Task<object>> ObtenerInfoTarjeta;
    public Func<object, Task<object>> CancelarOperacion;
    public Func<object, Task<object>> ReimprimirVoucher;
    public Func<object, Task<object>> consultarTransacciones;
}

public class Startup {

    public async Task<object> Invoke(object ignore)
    {
        ServicePointManager.Expect100Continue = true;
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

        clsCpIntegracionEMV cpIntegraEMV = new clsCpIntegracionEMV();
        Proxy result = new Proxy();
        
        // defs
        string url = "";
        string urlKey = "";
        string usuario = "";
        string password = "";
        string version = "";
        string s_Company = "";
        string s_CompanyId = "";
        string s_Branch = "";
        string s_BranchId = "";
        string s_Country = "";
        bool magtek = false;
        bool inicializado = false;
        bool logMIT = false;

        result.Inicializar = async (object input) => {
            return Task.Run(() => {
                IDictionary<string, object> resultado = new Dictionary<string, object>();
                IDictionary<string, object> payload = (IDictionary<string,object>)input;

                version = cpIntegraEMV.dbgGetVersion().Replace("CP-D","");
                resultado.Add("DllVersion", version);

                url = (string) payload["url"];
                urlKey = (string) payload["urlPublicKey"];
                usuario = (string) payload["usuario"];
                password = (string) payload["password"];
                magtek = (bool) payload["magtek"];
                logMIT = (bool) payload["logMIT"];

                cpIntegraEMV.dbgSetUrl(url);
                cpIntegraEMV.dbgEnabledLog(logMIT);
                cpIntegraEMV.dbgSetActivateMagtek(magtek);
                cpIntegraEMV.dbgSetTimeOut("20");

                // Login del usuario
                if(!cpIntegraEMV.dbgLoginUser(usuario, password)) 
                {
                    resultado.Add("status", "error");
                    resultado.Add("mensaje", "Usuario o contraseña incorrectos.");
                    return JsonConvert.SerializeObject(resultado);
                }
                                
                // Obtenemos llave publica
                cpIntegraEMV.dbgSendMessage("Solicitando llave...");
                cpIntegraEMV.dbgSetUrlIpKeyWeb(urlKey);
                cpIntegraEMV.ObtieneLlavePublicaRSA();

                if (cpIntegraEMV.getRespPublicKeyRSA().ToUpper().Equals("FALSE")) 
                {
                    string errMsg = (string) cpIntegraEMV.getErrorPublicKeyRSA();

                    if(errMsg.Contains("Código 99"))
                    {
                        errMsg = "99 - El servicio de la llave pública RSA no esta disponible.";
                    }
                    resultado.Add("status", "error");
                    resultado.Add("mensaje", errMsg);
                    return JsonConvert.SerializeObject(resultado);
                }

                s_Company = (string) cpIntegraEMV.dbgGetNb_Company();
                s_CompanyId = (string) cpIntegraEMV.dbgGetId_Company();
                s_Branch = (string) cpIntegraEMV.dbgGetNb_Branch();
                s_BranchId = (string) cpIntegraEMV.dbgGetId_Branch();
                s_Country = (string) cpIntegraEMV.dbgGetCountry();

                inicializado = true;
                resultado.Add("status", "success");
                return JsonConvert.SerializeObject(resultado);
            });
        };

        result.CancelarOperacion = async (object input) => {
            return Task.Run(() => {
                
                cpIntegraEMV.dbgCancelOperation();
                cpIntegraEMV.dbgEndOperation();

                IDictionary<string, object> resultado = new Dictionary<string, object>();
                resultado.Add("status", "success");
                resultado.Add("mensaje", "Operación cancelada.");
                
                return JsonConvert.SerializeObject(resultado);
            });
        };

        result.ReimprimirVoucher = async (object input) => {
            return Task.Run(() => {
                IDictionary<string, object> payload = (IDictionary<string,object>)input;
                IDictionary<string, object> resultado = new Dictionary<string, object>();

                if (!inicializado) {
                    resultado.Add("status", "error");
                    resultado.Add("mensaje", "Pinpad no inicializado");
                    return JsonConvert.SerializeObject(resultado);
                }
                
                cpIntegraEMV.sndReimpresion(usuario, password, (string)s_CompanyId, (string)s_BranchId, (string)s_Country, (string)payload["referencia"]);

                switch (cpIntegraEMV.getRspDsResponse())
                {
                    case "approved":  //Transacción Aprobada
                        resultado.Add("status", "success");
                        resultado.Add("getRspVoucher", cpIntegraEMV.getRspVoucher());
                        break;

                    case "denied":
                        resultado.Add("status", "error");
                        resultado.Add("mensaje", cpIntegraEMV.getRspFriendlyResponse());
                        break;

                    case "error":
                        resultado.Add("status", "error");
                        resultado.Add("mensaje", cpIntegraEMV.getRspFriendlyResponse());
                        string error = cpIntegraEMV.getRspDsResponse() + " DescError = " + cpIntegraEMV.getRspDsError() +
                        " CodError =  " + cpIntegraEMV.getRspCdError() + "\r\n" + cpIntegraEMV.getRspFriendlyResponse();
                        break;

                    default:
                        resultado.Add("status", "error");
                        resultado.Add("mensaje", "Ocurrio un problema de conexion" + cpIntegraEMV.getRspDsError());
                        break;
                }

                return JsonConvert.SerializeObject(resultado);
            });
        };

        result.ObtenerInfoTarjeta = async (object input) => {
            return Task.Run(() => {
                string txtOperType = "11";
                string txtMerchant = "";

                IDictionary<string, object> resultado = new Dictionary<string, object>();

                if (!inicializado) {
                    resultado.Add("status", "error");
                    resultado.Add("mensaje", "Pinpad no inicializado");
                    return JsonConvert.SerializeObject(resultado);
                }

                try
                {
                    IDictionary<string, object> payload = (IDictionary<string,object>)input;
                    string total = (string) payload["total"];
                    string cvvAmex = "";

                    cpIntegraEMV.dbgSetUrl(url);
                    cpIntegraEMV.dbgHidePopUp(true);
                    cpIntegraEMV.HidePopUpDCC(false);

                    cpIntegraEMV.dbgSetCurrency("MXN");
                    cpIntegraEMV.dbgStartTxEMV(total);

                    if (cpIntegraEMV.chkPp_CdError() == "")
                    {
                        string chkCc_Number = cpIntegraEMV.chkCc_Number();
                        string chkCc_Name = cpIntegraEMV.chkCc_Name();
                        string chkCc_ExpMonth = cpIntegraEMV.chkCc_ExpMonth();
                        string chkCc_ExpYear = cpIntegraEMV.chkCc_ExpYear();
                        string chkCc_AID = cpIntegraEMV.chkCc_AID();
                        string chkCc_AIDLabel = cpIntegraEMV.chkCc_AIDLabel();
                        string errMsg = "";

                        string CardType = "V/MC";
                        if (cpIntegraEMV.dbgGetisAmex())
                        {
                            CardType = "AMEX";
                        }

                        string DescripcionMoneda = cpIntegraEMV.GetTipoMoneda();

                        resultado.Add("status", "success");
                        resultado.Add("chkCc_Number", chkCc_Number);
                        resultado.Add("chkCc_Name", chkCc_Name);
                        resultado.Add("chkCc_ExpMonth", chkCc_ExpMonth);
                        resultado.Add("chkCc_ExpYear", chkCc_ExpYear);
                        resultado.Add("chkCc_AID", chkCc_AID);
                        resultado.Add("chkCc_AIDLabel", chkCc_AIDLabel);
                        resultado.Add("CardType", CardType);
                        resultado.Add("DescripcionMoneda", DescripcionMoneda);
                        resultado.Add("importe", total);

                        return JsonConvert.SerializeObject(resultado);
                    }
                    else 
                    {
                        string errMsg = cpIntegraEMV.chkPp_DsError();
                        if (errMsg == "01" || errMsg == "PPE03")
                        {
                            errMsg = "No hay respuesta del pinpad, asegurese de que esta conectado.";
                        }
                        resultado.Add("status", "error");
                        resultado.Add("mensaje", errMsg);
                        cpIntegraEMV.dbgEndOperation();
                        cpIntegraEMV.dbgCancelOperation();
                        return JsonConvert.SerializeObject(resultado);
                    }
                }
                catch (Exception e)
                {
                    Console.WriteLine(e.ToString());
                    resultado.Add("status", "error");
                    resultado.Add("mensaje", e.ToString());
                    cpIntegraEMV.dbgEndOperation();
                    cpIntegraEMV.dbgCancelOperation();
                    return JsonConvert.SerializeObject(resultado);
                }
            });
        };

        result.consultarTransacciones = async (object input) => {
            return Task.Run(() => {
                IDictionary<string, object> payload = (IDictionary<string,object>)input;
                string fecha = (string) payload["fecha"];
                string referencia = (string) payload["referencia"];

                string respuesta = cpIntegraEMV.sndConsulta(
                    usuario, 
                    password, 
                    s_CompanyId, 
                    s_BranchId, 
                    fecha,
                    referencia
                );
                
                return respuesta;
            });
        };
        
        result.RealizarCobro = async (object input) => {
            return Task.Run(() => {

                string txtOperType = "11";
                string txtMerchant = "";

                IDictionary<string, object> resultadoCobro = new Dictionary<string, object>();

                if (!inicializado) {
                    resultadoCobro.Add("status", "error");
                    resultadoCobro.Add("mensaje", "Pinpad no inicializado");
                    return JsonConvert.SerializeObject(resultadoCobro);
                }

                try   
                {  
                    IDictionary<string, object> payload = (IDictionary<string,object>)input;
                    string total = (string) payload["total"];
                    string txtRef = (string) payload["ref"];
                    string cajero = (string) payload["cajero"];
                    bool tarjetaPrecargada = (bool) payload["tarjetaPrecargada"];
                    string cvvAmex = "";

                    if(!tarjetaPrecargada) {
                        cpIntegraEMV.dbgSetUrl(url);
                        cpIntegraEMV.dbgHidePopUp(true);
                        cpIntegraEMV.dbgSetCurrency("MXN");
                        cpIntegraEMV.dbgStartTxEMV(total);
                    }


                    if (cpIntegraEMV.chkPp_CdError() == "")
                    {
                        string chkCc_Number = cpIntegraEMV.chkCc_Number();
                        string chkCc_Name = cpIntegraEMV.chkCc_Name();
                        string chkCc_ExpMonth = cpIntegraEMV.chkCc_ExpMonth();
                        string chkCc_ExpYear = cpIntegraEMV.chkCc_ExpYear();
                        string chkCc_AID = cpIntegraEMV.chkCc_AID();
                        string chkCc_AIDLabel = cpIntegraEMV.chkCc_AIDLabel();
                        string errMsg = "";

                        /* Ocultar popup MSI, Contado, etc */
                        cpIntegraEMV.dbgSetHidePopUpMerchant(true);
                        /* xml con id cobro afiliacion (MSI, Contado, etc) */
                        txtMerchant = cpIntegraEMV.dbgGetMerchantBanda(txtOperType);
                        if (cpIntegraEMV.getRspCdError() != "") {
                            resultadoCobro.Add("status", "error");
                            resultadoCobro.Add("mensaje", cpIntegraEMV.getRspCdError() + " - " + cpIntegraEMV.getRspDsError());
                            return JsonConvert.SerializeObject(resultadoCobro);
                        }

                        XmlDocument doc = new XmlDocument();
                        doc.LoadXml("<root>" + txtMerchant + "</root>");
                        XmlNode merch = doc.DocumentElement.SelectSingleNode("/root/contado/af/merchant");
                        txtMerchant = merch.InnerText;

                        string CardType = "V/MC";

                        if (cpIntegraEMV.dbgGetisAmex())
                        {
                            CardType = "AMEX";
                        }
                        string DescripcionMoneda = cpIntegraEMV.GetTipoMoneda();
                        
                        resultadoCobro.Add("txtMerchant", txtMerchant);
                        
                        cpIntegraEMV.sndVtaDirectaEMV(
                            usuario, 
                            password, 
                            cajero, 
                            s_CompanyId, 
                            s_BranchId, 
                            s_Country, 
                            CardType, 
                            txtMerchant, 
                            txtRef, 
                            txtOperType, 
                            DescripcionMoneda, 
                            cvvAmex
                        );

                        string RspDsResponse = (string) cpIntegraEMV.getRspDsResponse();
                        
                        switch(RspDsResponse) 
                        {
                            case "approved":
                                resultadoCobro.Add("status", "success");
                                resultadoCobro.Add("chkCc_Number", chkCc_Number);
                                resultadoCobro.Add("chkCc_Name", chkCc_Name);
                                resultadoCobro.Add("chkCc_ExpMonth", chkCc_ExpMonth);
                                resultadoCobro.Add("chkCc_ExpYear", chkCc_ExpYear);
                                resultadoCobro.Add("chkCc_AID", chkCc_AID);
                                resultadoCobro.Add("chkCc_AIDLabel", chkCc_AIDLabel);
                                resultadoCobro.Add("getTx_Amount", cpIntegraEMV.getTx_Amount());
                                resultadoCobro.Add("getRspOperationNumber", cpIntegraEMV.getRspOperationNumber());
                                resultadoCobro.Add("getRspAuth", cpIntegraEMV.getRspAuth());
                                resultadoCobro.Add("getRspCdResponse", cpIntegraEMV.getRspCdResponse());
                                resultadoCobro.Add("getTx_Reference", cpIntegraEMV.getTx_Reference());
                                resultadoCobro.Add("getRspArqc", cpIntegraEMV.getRspArqc());
                                resultadoCobro.Add("getRspAppid", cpIntegraEMV.getRspAppid());
                                resultadoCobro.Add("getRspAppidlabel", cpIntegraEMV.getRspAppidlabel());
                                resultadoCobro.Add("getRspVoucher", cpIntegraEMV.getRspVoucher());
                                resultadoCobro.Add("getRspDate", cpIntegraEMV.getRspDate());
                                resultadoCobro.Add("chkPp_Serial", cpIntegraEMV.chkPp_Serial());
                                break;
                                
                            case "denied":
                                errMsg = cpIntegraEMV.getRspFriendlyResponse();
                                /* Mensaje amigable + getRspFriendlyResponse */
                                resultadoCobro.Add("getRspOperationNumber", cpIntegraEMV.getRspOperationNumber());
                                resultadoCobro.Add("getRspCdResponse", cpIntegraEMV.getRspCdResponse());
                                resultadoCobro.Add("getTx_Reference", cpIntegraEMV.getTx_Reference());
                                resultadoCobro.Add("getTx_Amount", cpIntegraEMV.getTx_Amount());
                                resultadoCobro.Add("chkPp_Serial", cpIntegraEMV.chkPp_Serial());
                                resultadoCobro.Add("getRspDate", cpIntegraEMV.getRspDate());
                                resultadoCobro.Add("getRspAuth", cpIntegraEMV.getRspAuth());

                                resultadoCobro.Add("status", "error");
                                resultadoCobro.Add("mensaje", "La operación fue rechazada por su banco emisor:\n " + errMsg);
                                break; 

                            case "error":
                                resultadoCobro.Add("status", "error");
                                resultadoCobro.Add("getRspOperationNumber", cpIntegraEMV.getRspOperationNumber());
                                resultadoCobro.Add("getRspCdResponse", cpIntegraEMV.getRspCdResponse());
                                resultadoCobro.Add("getTx_Reference", cpIntegraEMV.getTx_Reference());
                                resultadoCobro.Add("getTx_Amount", cpIntegraEMV.getTx_Amount());
                                resultadoCobro.Add("chkPp_Serial", cpIntegraEMV.chkPp_Serial());
                                resultadoCobro.Add("getRspDate", cpIntegraEMV.getRspDate());
                                
                                resultadoCobro.Add("errCode", cpIntegraEMV.getRspCdError());
                                resultadoCobro.Add("mensaje", cpIntegraEMV.getRspDsError());
                                break;
                                   
                            default:                                
                                resultadoCobro.Add("status", "error");
                                resultadoCobro.Add("mensaje", "La respuesta de la pinpad fué inesperada:\n " + RspDsResponse);

                                resultadoCobro.Add("chkCc_Number", chkCc_Number);
                                resultadoCobro.Add("chkCc_Name", chkCc_Name);
                                resultadoCobro.Add("chkCc_ExpMonth", chkCc_ExpMonth);
                                resultadoCobro.Add("chkCc_ExpYear", chkCc_ExpYear);
                                resultadoCobro.Add("chkCc_AID", chkCc_AID);
                                resultadoCobro.Add("chkCc_AIDLabel", chkCc_AIDLabel);
                                resultadoCobro.Add("chkPp_Serial", cpIntegraEMV.chkPp_Serial());
                                
                                // es necesario comprobar la transaccion
                                resultadoCobro.Add("comprobarTransaccion", true);
                                
                                break;                             
                        }

                        cpIntegraEMV.dbgEndOperation();
                        cpIntegraEMV.dbgCancelOperation();
                        return JsonConvert.SerializeObject(resultadoCobro);
                    }
                    else
                    {
                        string errMsg = cpIntegraEMV.chkPp_DsError();
                        if (errMsg == "01" || errMsg == "PPE03")
                        {
                            errMsg = "No hay respuesta del pinpad, asegurese de que esta conectado.";
                        }
                        resultadoCobro.Add("status", "error");
                        resultadoCobro.Add("mensaje", errMsg);
                        cpIntegraEMV.dbgEndOperation();
                        return JsonConvert.SerializeObject(resultadoCobro);
                    }
                }  
                catch (Exception e)
                {
                    Console.WriteLine(e.ToString());
                    resultadoCobro.Add("status", "error");
                    resultadoCobro.Add("mensaje", e.ToString());
                    cpIntegraEMV.dbgEndOperation();
                    cpIntegraEMV.dbgCancelOperation();
                    return JsonConvert.SerializeObject(resultadoCobro);
                }

            });
        };

        return result;
    }
}
