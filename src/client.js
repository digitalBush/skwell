const { ISOLATION_LEVEL } = require( "tedious" );
const { createNamespace } = require( "cls-hooked" );

const Api = require( "./api" );

const _pool = Symbol( "skwell:pool" );
const _cls = Symbol( "skwell:cls" );

class Client extends Api {

	constructor( pool ) {
		super();
		this[ _pool ] = pool;
		this[ _cls ] = createNamespace( "skwell" );
	}

	async withConnection( action ) {
		let conn;
		const ambientConn = this[ _cls ].get( "transaction" );
		try {
			conn = ambientConn || await this[ _pool ].acquire();
			const result = await action( conn );
			return result;
		} finally {
			if ( conn && !ambientConn ) {
				await this[ _pool ].release( conn );
			}
		}
	}

	transaction( action, isolationLevel ) {
		if ( isolationLevel === undefined ) {
			isolationLevel = ISOLATION_LEVEL.READ_COMMITTED;
		}
		return this[ _cls ].runAndReturn( () => this.withConnection( async conn => {
			this[ _cls ].set( "transaction", conn );

			try {
				await conn.beginTransaction( "" /* name */, isolationLevel );
				const result = await action();
				await conn.commitTransaction();
				return result;
			} catch ( err ) {
				// TODO: wrap err instead of mangling message
				err.message = `Automatic Rollback. Failed Because: ${ err.message }`;
				await conn.rollbackTransaction();
				throw err;
			}
		} ) );
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
		if ( name.indexOf( "#" ) === 0 && !this[ _cls ].get( "transaction" ) ) {
			throw new Error( `Unable to load temp table '${ tableName }' using connection pool. Use a transaction instead.` );
		}

		return super.bulkLoad( tableName, options );
	}

}

module.exports = Client;
