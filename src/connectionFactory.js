const { promisify } = require( "util" );
const tedious = require( "tedious" );

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

let id = 0;

function create( config ) {
	return new Promise( ( resolve, reject ) => {
		const conn = new tedious.Connection( config );
		conn.id = id++;
		promisifyConnection( conn );

		conn.on( "connect", err => {
			if ( err ) {
				return reject( err );
			}
			return resolve( conn );
		} );
	} );
}

module.exports = { create };

