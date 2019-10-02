import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { mensajeFlash, setDescargarActualizacion, mostrarAlerta } from '../actions';
import TituloComponent from '../components/TituloComponent';
import AutoUpdater from 'nw-autoupdater';
import pjson from '../../package.json';
import request from 'request';
import fs from 'fs';

class Actualizaciones extends React.Component {
	constructor(props) {
		super(props)
        this.state = {
            cargando: true,
            pathDescarga: null,
            totalDescargado: 0
        }
    }

    async getRemoteManifest(updater) {
        try {
            const rManifest = await updater.readRemoteManifest()
            return rManifest
        } catch(err) {
            this.props.mensajeFlash('error', 'Hubo un error al obetener información de la actualización.')
            return false
        }
    }

    async componentDidMount() {
        const updater = new AutoUpdater(pjson)
        const rManifest = await this.getRemoteManifest(updater)
        
        if (!rManifest) {
            this.setState({
                cargando: false,
                upToDate: true
            }) 

            return this.props.mensajeFlash('error', 'Hubo un error al obetener información de la actualización.')
        }

        const needsUpdate = await updater.checkNewVersion( rManifest )
        let urlInstaller = rManifest.packages.win32.installer

        if ( !needsUpdate ) {
            this.setState({
                cargando: false,
                upToDate: true,
                urlInstaller: urlInstaller
            }) 
        } else {
        	this.setState({
                cargando: false,
        		upToDate: false,
                newVersion: rManifest.version,
                urlInstaller: urlInstaller,
                description: rManifest.description,
        	})         
        }

        setDescargarActualizacion({
                'status': 'descargando',
                'progreso': 30
            })
    }

    async actualizar() {
        const updater = new AutoUpdater(pjson)
        const rManifest = await this.getRemoteManifest(updater)
        const setDescargarActualizacion = this.props.setDescargarActualizacion

        if (!rManifest) {
            return this.props.mensajeFlash('error', 'Hubo un error al obetener información de la actualización.')
        }

        updater.on( "download", ( downloadSize, totalSize ) => {
            console.log(`Descargando ${Math.floor( downloadSize / totalSize * 100 )}`)
            setDescargarActualizacion({
                'status': 'descargando',
                'progreso': Math.floor( downloadSize / totalSize * 100 )
            })
        })
        
        updater.on( "install", ( installFiles, totalFiles ) => {
            console.log(`Instalando ${Math.floor( installFiles / totalFiles * 100 )}`)
            setDescargarActualizacion({
                'status': 'instalando',
                'progreso': Math.floor( installFiles / totalFiles * 100 )
            })
        })
        
        try {
            alert(`La descarga esta por iniciar, una vez concluida la actualización la aplicación se reiniciará de manera automática.`)
            setDescargarActualizacion({
                'status': 'descargando',
                'progreso': 0
            })
            
            const updateFile = await updater.download( rManifest );
            await updater.unpack(updateFile, {debounceTime: 2000});

            await updater.restartToSwap();
        } catch( e ) {
            this.setState({
                cargando: false,
                upToDate: false,
                newVersion: rManifest.version
            })

            this.props.mensajeFlash('error', 'Hubo un error al instalar la actualización.')

            alert(e)
        } 
    }


    iniciarDescargaInstalador() {
        const comp = this
        const setDescargarActualizacion = comp.props.setDescargarActualizacion
        const mostrarAlerta = comp.props.mostrarAlerta
        let file_url = comp.state.urlInstaller;
        let out = fs.createWriteStream(comp.state.pathDescarga);
        let req = request({
            method: 'GET',
            uri: file_url
        });

        let downloadSize = 0
        let downloaded = 0

        req.pipe(out);

        req.on('response', function (data) {
            downloadSize = data.headers['content-length']
            setDescargarActualizacion({
                'status': 'descargando',
                'progreso': 0
            })
        });

        req.on('data', function (chunk) {
            downloaded = downloaded - chunk.length
            let porcentaje = +Math.abs(downloaded * 100 / downloadSize).toFixed(0)

            if (comp.props.statusActualizacion && porcentaje > comp.props.statusActualizacion.progreso + 2) {
                setDescargarActualizacion({
                    'status': 'descargando',
                    'progreso': porcentaje
                })
            }
        });

        req.on('end', function() {
            setDescargarActualizacion(null)
            try {
                /*const spawn = require('child_process').spawn;
                spawn(`start /b ${comp.state.pathDescarga}`, {
                    stdio: 'ignore', 
                    detached: true
                }).unref();*/

                mostrarAlerta({
                    mensaje: `La descarga de la actualización ha finalizado en <b>${comp.state.pathDescarga}</b>, para realizar la instalación es neceario cerrar la aplicación.`
                })
            } catch(e) {
                mostrarAlerta({
                    mensaje: `La descarga de la actualización ha finalizado en <b>${comp.state.pathDescarga}</b>`
                })
            }
        });
    }

    changePathGuardarActualizacion(e) {
        this.setState({
            pathDescarga: e.target.value
        })

        setTimeout(() => {
            this.iniciarDescargaInstalador()
        }, 500)
    }

    render() {
        const statusActualizacion = this.props.statusActualizacion
        
        return (
            <div className="Actualizaciones">
                <TituloComponent texto="Actualizaciones"></TituloComponent>

                { this.state.cargando ?
                    <div className="text-center">
                        <div className="iconDownload mb-0" style={{borderColor: "transparent"}}>
                            <i className="ion-load-c"></i>
                        </div>
                        <h3 className="text-primary">
                            Verificando actualización
                        </h3>
                    </div> :
                    <div>
                        { this.state.upToDate ? 
                        <div className="text-center">
                            <div className="iconDownload mb-0" style={{borderColor: "transparent"}}>
                                <i className="ion-ios-checkmark-outline text-success"></i>
                            </div>
                            <h3 className="text-primary">
                                Admintotal ya se encuentra en la última versión.
                            </h3>
                        </div> :
                        <div className="text-center">
                            <div className="iconDownload mb-0">
                                <i className="ion-ios-cloud-download-outline"></i>
                            </div>
                            { Boolean(statusActualizacion) && 
                                <div>
                                    <div>{statusActualizacion.status} actualización....</div>
                                    <div className="progress" style={{width: "300px", margin: "0px auto"}}>
                                        <div 
                                            className="progress-bar progress-bar-striped progress-bar-animated bg-info" 
                                            role="progressbar" 
                                            aria-valuemax="100" 
                                            style={{width: `${statusActualizacion.progreso || 0}%`}}>
                                        </div>
                                    </div>
                                </div>
                            }

                            <br/>

                            <h3 className="text-primary">
                                ¡Hay una nueva versión de Admintotal disponible!
                            </h3>
                            <div className="container-fluid">
                                <div className="row">
                                    { Boolean(this.state.description) && 
                                        <div className="col">
                                            <div class="text-left my-2 mx-5 card card-body">
                                                <div className="text-info font-weight-bold py-2 border-bottom">
                                                    <i className="ion-info"></i> Información sobre la actualización:
                                                </div>
                                                <div className="wysiwyg-content" dangerouslySetInnerHTML={{__html:this.state.description}}></div>
                                            </div>
                                        </div>
                                    }
                                    <div className="col-md-4">
                                        { Boolean(this.state.urlInstaller) && 
                                            <div>
                                                <div className="fileInputWrapper btn btn-primary">
                                                    Descargar Actualización <b>v{this.state.newVersion}</b>
                                                    <input type="file" nwsaveas={this.state.urlInstaller.split('/').pop()} onChange={this.changePathGuardarActualizacion.bind(this)} />
                                                </div>
                                            </div>
                                        }

                                        <p className="text-info mt-2">
                                            <small>La versión instalada de Admintotal es <b>v{pjson.version}</b></small>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        }               
                    </div>
                }
            </div>
        );
    }
}

const mapStateToProps = state => ({
    ...state.app
});

const mapDispatchToProps = dispatch => bindActionCreators({mensajeFlash, setDescargarActualizacion, mostrarAlerta}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Actualizaciones);