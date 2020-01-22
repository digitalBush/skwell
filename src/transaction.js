const Api = require( "./api" );

const _state = Symbol( "skwell:tx-state" );

class Transaction extends Api {

	constructor( connection, context ) {
		super();
		this[ _state ] = { connection };
		this.context = context;
	}

	static async run( { connection, isolationLevel, action, context, onBeginTransaction, onEndTransaction } ) {
		const tx = new Transaction( connection, context );
		try {
			await connection.beginTransaction( "" /* name */, isolationLevel );
			await onBeginTransaction( tx );
			const result = await action( tx );
			await onEndTransaction( tx );
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
