const Api = require( "./api" );

const _state = Symbol( "skwell:tx-state" );

class Transaction extends Api {

	constructor( connection ) {
		super();
		this[ _state ] = { connection, rolledBack: false };
	}

	static async run( connection, isolationLevel, action ) {
		const tx = new Transaction( connection );
		try {
			await connection.beginTransaction( "" /* name */, isolationLevel );
			const result = await action( tx );
			await tx.commit();
			return result;
		} catch ( err ) {
			if ( tx[ _state ].rolledBack ) {
				throw new Error( "Manual Rollback" );
			}
			// TODO: wrap err instead of mangling message
			err.message = `Automatic Rollback. Failed Because: ${ err.message }`;
			await tx.rollback( err );
		}
	}

	async withConnection( action ) {
		return Promise.resolve( action( this[ _state ].connection ) );
	}

	async commit() {
		return this[ _state ].connection.commitTransaction();
	}

	async rollback( err ) {
		await this[ _state ].connection.rollbackTransaction();
		this[ _state ].rolledBack = true;
		throw err;
	}

}


module.exports = Transaction;
