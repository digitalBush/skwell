const { ISOLATION_LEVEL } = require( "tedious" );

const Api = require( "./api" );
const Transaction = require( "./transaction" );
const poolFactory = require( "./poolFactory" );

const _state = Symbol( "skwell:client-state" );

class Client extends Api {

	constructor( config ) {
		super();

		const pool = poolFactory( this, config );

		pool.on( "factoryCreateError", e => {
			this.emit( "error", e );
		} );

		const {
			onBeginTransaction = () => {},
			onEndTransaction = () => {}
		} = config;

		this[ _state ] = {
			pool,
			onBeginTransaction,
			onEndTransaction
		};

		// Defer pool start so that we can bind error handlers
		setImmediate( () => pool.start() );
	}

	async withConnection( action ) {
		let connection;
		const { pool } = this[ _state ];
		try {
			connection = await pool.acquire();
			const result = await action( connection );
			return result;
		} finally {
			if ( connection ) {
				await pool.release( connection );
			}
		}
	}

	transaction( action, opts ) {
		let isolationLevel, context;
		if ( typeof opts === "object" ) {
			( { isolationLevel, context } = opts );
		} else if ( opts ) {
			isolationLevel = opts;
		}

		if ( isolationLevel === undefined ) {
			isolationLevel = ISOLATION_LEVEL.READ_COMMITTED;
		}
		const { onBeginTransaction, onEndTransaction } = this[ _state ];

		return this.withConnection( connection => Transaction.run( { connection, isolationLevel, action, context, onBeginTransaction, onEndTransaction } ) );
	}

	async dispose() {
		const { pool } = this[ _state ];
		await pool.drain().then( () => {
			return pool.clear();
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
