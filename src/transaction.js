const Api = require( "./api" );

const _state = Symbol( "skwell:tx-state" );

class Transaction extends Api {

	constructor( connection ) {
		super();
		this[ _state ] = { connection };
	}

	static async run( connection, isolationLevel, action ) {
		const tx = new Transaction( connection );
		try {
			await connection.beginTransaction( "" /* name */, isolationLevel );
			const result = await action( tx );
			await connection.commitTransaction();
			return result;
		} catch ( err ) {
			// TODO: wrap err instead of mangling message
			err.message = `Automatic Rollback. Failed Because: ${ err.message }`;
			try {
				await connection.rollbackTransaction();
			} catch ( _ ) {
				connection.close();
			}
			throw err;
		}
	}

	async withConnection( action ) {
		return Promise.resolve( action( this[ _state ].connection ) );
	}

}


module.exports = Transaction;
