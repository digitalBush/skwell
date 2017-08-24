const { promisify } = require( "util" );

const tedious = require( "tedious" );
const genericPool = require( "generic-pool" );

const Client = require( "./client" );

function promisifyConnection( conn ) {
	const originalBeginTransaction = conn.beginTransaction;

	Object.assign( conn, {
		beginTransaction( name, isolationLevel ) {
			return new Promise( ( resolve, reject ) => {
				const cb = err => {
					if ( err ) {
						return reject( err );
					}
					return resolve();
				};
				originalBeginTransaction.call( conn, cb, name, isolationLevel );
			} );
		},
		commitTransaction: promisify( conn.commitTransaction ),
		rollbackTransaction: promisify( conn.rollbackTransaction ),
		reset: promisify( conn.reset )
	} );
}

function buildConfigs( config ) {
	const poolConfig = Object.assign( { min: 1, max: 10 }, ( config.pool || {} ) );
	poolConfig.testOnBorrow = true;

	const { username, password, server, domain, port, database } = config;
	const tediousConfig = {
		userName: username,
		password,
		server,
		domain,
		options: {
			port,
			database
		}
	};

	return {
		pool: poolConfig,
		tedious: tediousConfig
	};
}

// TODO: timeouts
function connect( config ) {
	const configs = buildConfigs( config );

	let id = 0;
	const factory = {
		create() {
			return new Promise( ( resolve, reject ) => {
				const conn = new tedious.Connection( configs.tedious );
				conn.id = id++;
				promisifyConnection( conn );

				conn.on( "connect", err => {
					if ( err ) {
						return reject( err );
					}
					return resolve( conn );
				} );
			} );
		},
		validate( conn ) {
			return conn.reset()
				.then( x => true )
				.catch( x => false );
		},
		destroy( conn ) {
			return new Promise( resolve => {
				conn.on( "end", () => {
					resolve();
				} );
				conn.close();
			} );
		}
	};

	const pool = genericPool.createPool( factory, configs.pool );

	return new Client( pool );
}
module.exports = {
	connect
};
