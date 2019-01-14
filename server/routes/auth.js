const api = require('../services')
const moment = require('moment')
const db = require('../db')
const bcrypt = require('bcrypt-nodejs');
const sincronizar = require('./sincronizar')
const helpers = require('../helpers')
const logger = require('../logger').logger

const remoteLogin = (options) => {
	return new Promise((resolve, reject) => {
		api._post(options).then(async (result) => {
			if (! result ) {
				logger.log('error', 'Problemas de comunicación con admintotal.')
				return reject({status: 'error', message: 'Problemas de comunicación con admintotal.'})
			}

			if (('status' in result)) {
				return resolve(result)
			}
			
			logger.log('error', {e: result})
			return reject(result)

		}).catch((err) =>{
			logger.log('error', {
				message: 'Error al hacer el login remoto', 
				e: err,
				options: options
			})
			return reject(err)
		})
	})
}

exports.login = (req, res) => {
	var clave = req.body.claveCliente;

	if (! clave ) {
		return res.json({status: 'error', message: 'Es necesario especificar la clave del cliente.'});
	}

	return db._get(clave).then(async (DB) => {
		let options = {
		    path: '/auth/login/',
		    claveCliente: clave,
		    timeout: 15000,
		    data: {'username': req.body.usuario, 'password': req.body.password}
		}

		remoteLogin(options).then(async (result) => {
			switch(result.status) {
				case 'success':
					let session = result.data.usuario
					let exp = moment().endOf('day').toISOString()
					let passHash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10))

					if (!session.api_token) {
						await DB.usuarios.remove({username: req.body.usuario})
						return res.json({
							status: 'error',
							message: `El usuario ${req.body.usuario} no tiene habilitado el acceso a la API.`
						})
					}

					process.env._AK = session.api_token

					session.start = moment().toISOString();
					session.claveCliente = clave;
					session.password = passHash;

					let update_query = {$set: {api_key: session.api_token, expira: exp, claveCliente: clave, usuario: req.body.usuario}}
					await db._api.update({claveCliente: clave}, update_query, {upsert: true})
					let configuracion = await api._get({path: '/sincronizar/configuracion', data: {api_key: session.api_token}})
					
					if (configuracion.status != 'success') {
						return res.json({
							status: 'error',
							message: 'Hubo un error al obtener la configuración del cliente'
						})
					}

					await DB.usuarios.update({id: session.id}, {$set: session}, {upsert: true})
					await DB.conf.update({}, {$set: {configuracion: configuracion.data}}, {upsert: true})
					
					// consultamos y guardamos los almacenes
					// TODO: cambiar por un método
					api._get({path: '/almacenes', data: {api_key: session.api_token, limit: 100}}).then((response) => {
						response.objects.map((almacen) => {
							DB.almacenes.update({id: almacen.id}, {$set: almacen}, {upsert: true})
						})
					})
					.catch((error) => {

					})

					let usuario = await DB.usuarios.findOne({id: session.id})
					if (usuario.sesion_caja) {
						if (!moment(usuario.sesion_caja.fecha).isSame(moment(), "day")) {
							usuario.sesion_caja = null
							DB.usuarios.update({id: session.id}, {$set: {sesion_caja: null}})
						}
					}
					
					let conf = await DB.conf.findOne({})
					let siguienteFolio = await helpers.getFolio(DB, conf)
					let descargarClientes = await DB.clientes.findOne({})

					process.env.NUMERO_SERIE = conf.numero_serie

					return res.json({
						status: 'success', 
						usuario: usuario,
						configuracion: conf,
						siguienteFolio: siguienteFolio,
						descargarClientes: !Boolean(descargarClientes)
					})
					break;

				case 'error':
					return res.json(result)
					break;
			}

		}).catch(async (err) => {
			// intento de login con los datos almacenados
			let usuario = await DB.usuarios.findOne({username: req.body.usuario})
		
			if (!usuario) {
				return res.json(err || {
					status: 'error', 
					message: 'Es necesaria la conexión a internet para continuar.'
				})
			}
			
			if(bcrypt.compareSync(req.body.password, usuario.password)) {
				await db._api.update(
					{claveCliente: clave}, 
					{
						$set: {
							api_key: usuario.api_token, 
							expira: moment().endOf('day').toISOString(), 
							claveCliente: clave
						}
					}, 
					{upsert: true}
				)
				let conf = await DB.conf.findOne({})
				let siguienteFolio = await helpers.getFolio(DB, conf)
				let descargarClientes = await DB.clientes.findOne({})
				
				process.env._AK = usuario.api_token
				process.env.NUMERO_SERIE = conf.numero_serie
				
				conf['sesion_caja'] = usuario.sesion_caja

				return res.json({
					status: 'success', 
					usuario: usuario, 
					configuracion: conf, 
					siguienteFolio: siguienteFolio,
					descargarClientes: !Boolean(descargarClientes)
				})
			} else {
			 	return res.json({
			 		status: 'error', 
			 		message: 'Nombre de usuario o contraseña incorrectos.'
			 	})
			}
		})		
	})
}

exports.logout = (req, res) => {
	db._api.update({claveCliente: req.query.claveCliente}, {$set: {expira: null}})
	.then(() => {
		delete process.env._AK
		delete process.env.TENANT
		delete process.env.USER_NAME
		return res.json({'status': 'success'})
	}).catch((err) => {
		return res.json({'status': 'error'})
	})
}

exports.session = async (req, res) => {
	let doc = await db._api.cfind({expira: {$ne: null}}).sort({expira: -1}).limit(1).exec()
	if (doc.length) {
		let dbCliente = await db._get(doc[0].claveCliente)
		let usuario = await dbCliente.usuarios.cfind({start: {$ne: null}}).sort({start: -1}).limit(1).exec()
		usuario = usuario.length ? usuario.pop() : null

		if(!usuario) {
			return res.json({
				status: 'success', 
				session: null
			});
		}

		let configuracion = await dbCliente.conf.findOne({})
		delete usuario['password']
				
		// descarga de autorizaciones
		return sincronizar.obtenerAutorizaciones(doc[0].api_key, doc[0].claveCliente, async (err, data) => {
            if (data) {
                data.objects.map((a) => {
                	if (usuario.id == a.responsable) {
                		usuario.autorizaciones = a
                	}
                    
                    dbCliente.autorizaciones.update({responsable: a.responsable}, {$set: a}, {upsert: true})
                })
            }
			
			process.env._AK = usuario.api_token
			process.env.NUMERO_SERIE = configuracion.numero_serie
			let siguienteFolio = await helpers.getFolio(dbCliente, configuracion)
            return res.json({
				status: 'success', 
				session: usuario,
				data: configuracion,
				siguienteFolio: siguienteFolio
			})
        })
	}

	return res.json({status: 'success', session: null})
}