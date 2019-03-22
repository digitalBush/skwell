const { ISOLATION_LEVEL } = require( "tedious" );

const Api = require( "./api" );
const Transaction = require( "./transaction" );

const _pool = Symbol( "skwell:pool" );

class Client extends Api {

	constructor( pool ) {
		super();
		this[ _pool ] = pool;
	}

	async withConnection( action ) {
		let conn;
		try {
			conn = await this[ _pool ].acquire();
			const result = await action( conn );
			return result;
		} finally {
			if ( conn ) {
				await this[ _pool ].release( conn );
			}
		}
	}

	transaction( action, isolationLevel ) {
		if ( isolationLevel === undefined ) {
			isolationLevel = ISOLATION_LEVEL.READ_COMMITTED;
		}
		return this.withConnection( conn => Transaction.run( conn, isolationLevel, action ) );
	}

	async dispose() {
		const pool = this[ _pool ];
		await pool.drain().then( () => {
			pool.clear();
		} );
	}

	// Override base API to keep from loading a temp table on different connection.
	async bulkLoad( tableName, options ) {
		const name = tableName.split( "." ).pop().replace( "[", "" );
		if ( name.indexOf( "#" ) === 0 ) {
			throw new Error( `Unable to load temp table '${ tableName }' using connection pool. Use a transaction instead.` );
		}

		return super.bulkLoad( tableName, options );
	}

}

module.exports = Client;
