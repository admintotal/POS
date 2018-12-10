const Datastore = require('nedb');
const path = require('path');
const datastore = require('nedb-promise');
const pjson = require('../package.json');
const helpers = require('./helpers');

let defaultGeneralDoc = {
	sincronizaciones: {}
}

const getUserHome = () => {
	let home = process.platform === 'win32' ? 'USERPROFILE' : 'HOME'
	return process.env[home]
}

const getDbPath = (dbpath) => {
	if (helpers.isEnv('production')) {
		return path.join(getUserHome() + '/.Admintotal', dbpath)
	}
	return path.join(getUserHome() + '/AdmintotalData', dbpath)
}

let db = {}
let dbFolderName = helpers.isEnv('production') ? '.db' : 'db'

const baseDatosCliente = async (claveCliente, cb) => {
	let dbPath = path.join(__dirname, `../${dbFolderName}/${claveCliente}`);

	if (db[claveCliente]) {
		return cb(db[claveCliente], dbPath)
	}
	
	db[claveCliente] = {
		claveCliente: claveCliente,
		dbFolder: getDbPath(`${dbFolderName}/${claveCliente}`),
		conf: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/configuracion.db`)
		}),
		usuarios: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/usuarios.db`)
		}),
		clientes: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/clientes.db`)
		}),
		almacenes: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/almacenes.db`)
		}),
		productos: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/productos.db`)
		}),
		ventas: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/ventas.db`)
		}),
		autorizaciones: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/autorizaciones.db`)
		}),
		sesiones_caja: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/sesiones_caja.db`)
		}),
		retiros: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/retiros.db`)
		}),
		pedidos: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/pedidos.db`)
		}),
		recepciones_pago: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/recepciones_pago.db`)
		}),
		transacciones_pp: datastore({
			autoload: true, 
			// afterSerialization: afterSerialization,
			// beforeDeserialization: beforeDeserialization,
			filename: getDbPath(`${dbFolderName}/${claveCliente}/_tpp.db`)
		}),
	}

	let conf = await db[claveCliente].conf.findOne({})

	if (! conf ) {
		await db[claveCliente].conf.insert(defaultGeneralDoc)
	}

	if (typeof cb === 'function') {
		return cb(db[claveCliente], dbPath);
	}
}

const getDatabase = (claveCliente, cb) => {
	if (! db[claveCliente]) {
		return baseDatosCliente(claveCliente, (createdDatabase, dbPath) => {
			if (typeof cb === 'function') {
				return cb(db[claveCliente], dbPath)
			}
		});
	}

	if (typeof cb === 'function') {
		return cb(db[claveCliente])
	}
}


const get = (claveCliente, prom) => {
	return new Promise((resolve, reject) => {
		if (!claveCliente) {
			return reject("Es necesario especificar la clave del cliente.")
		}

		if (!(claveCliente in db)) {
			baseDatosCliente(claveCliente, function(createdDatabase, dbPath) {
				resolve(db[claveCliente], dbPath)
			})
		}

		resolve(db[claveCliente])
	})
}

const getByToken = (token) => {
	return new Promise((resolve, reject) => {
		return db.api.findOne({api_key: token}, (err, doc) => {
			if (doc) {
				process.env.TENANT = doc.claveCliente;
				process.env.USER_NAME = doc.usuario;

				return get(doc.claveCliente)
					.then((dbCliente) => {
						return resolve(dbCliente);
					})
			} else {
				return reject();
			}
		})
	})
}

module.exports.api = db.api;
module.exports.createDatabase = baseDatosCliente;
module.exports.cliente = getDatabase;
module.exports.get = get;
module.exports.getByToken = getByToken;
module.exports.storagePath = getDbPath;

module.exports._api = datastore({
	autoload: true, 
	// afterSerialization: afterSerialization,
	// beforeDeserialization: beforeDeserialization,
	filename: getDbPath(`${dbFolderName}/api.db`)
})

module.exports._getDB = (token) => {
	return new Promise(async (resolve, reject) => {
		let DB = module.exports._api
		let doc = await DB.findOne({api_key: token})
		
		if (!doc) {
			return reject({message: 'Token inválido'})
		}

		process.env.TENANT = doc.claveCliente;
		process.env.USER_NAME = doc.usuario;

		try {
			let dbCliente = await module.exports._get(doc.claveCliente)
			return resolve(dbCliente, doc.claveCliente)
		} catch(err) {
			console.log(err)
			return reject(err)
		}
	})
}

module.exports._get = (claveCliente) => {
	return new Promise((resolve, reject) => {
		try {
			baseDatosCliente(claveCliente, () => {
				resolve(db[claveCliente])
			})
		} catch(e) {
			reject(e)
		}
	})
}
