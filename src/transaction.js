const { ISOLATION_LEVEL } = require( "tedious" );

const Api = require( "./api" );

const _state = Symbol( "skwell:tx-state" );

class Transaction extends Api {

	constructor( connection ) {
		super();
		this[ _state ] = { connection, rolledBack: false };
	}

	static async run( connection, isolationLevel, action ) {
		if ( action === undefined ) {
			action = isolationLevel;
			isolationLevel = ISOLATION_LEVEL.READ_COMMITTED;
		}

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
			throw err;
		}
	}

	async withConnection( action ) {
		return Promise.resolve( action( this[ _state ].connection ) );
	}

	async commit() {
		return this[ _state ].connection.commitTransaction();
	}

	async rollback( err ) {
		if ( this[ _state ].rolledBack ) {
			return;
		}

		await this[ _state ].connection.rollbackTransaction();
		this[ _state ].rolledBack = true;
		throw err;
	}

}


module.exports = Transaction;
