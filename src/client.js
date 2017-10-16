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

	transaction( isolationLevel, action ) {
		return this.withConnection( conn => Transaction.run( conn, isolationLevel, action ) );
	}

	async dispose() {
		const pool = this[ _pool ];
		await pool.drain().then( () => {
			pool.clear();
		} );
	}

}

module.exports = Client;
