const { Request, ISOLATION_LEVEL } = require( "tedious" );
const EventEmitter = require( "events" );

const { addRequestParams, addBulkLoadParam } = require( "./parameterBuilder" );
const types = require( "./types" );
const fileLoader = require( "./fileLoader" );
const transformRow = require( "./transformRow" );
const RequestStream = require( "./RequestStream" );

function buildError( error, callStack ) {
	const capturedStackParts = callStack.split( "\n" ).slice( 1 );
	capturedStackParts.unshift( error.toString() );
	error.stack = capturedStackParts.join( "\n" );
	return error;
}

async function runQuery( conn, { text, methodName }, params ) {
	const sets = [];
	let rows;
	return new Promise( ( resolve, reject ) => {
		const request = new Request( text, err => {
			if ( err ) {
				return reject( err );
			}
			if ( rows !== undefined ) {
				sets.push( rows );
			}
			return resolve( sets );
		} );
		addRequestParams( request, params );
		request.on( "columnMetadata", () => {
			if ( rows ) {
				sets.push( rows );
			}
			rows = [];
		} );
		request.on( "row", obj => rows.push( transformRow( obj ) ) );
		conn[ methodName ]( request );
	} );
}

async function prepare( cmd ) {
	const result = await cmd;
	if ( result.procedure ) {
		return {
			text: result.procedure,
			methodName: "callProcedure"
		};
	}

	return {
		text: result,
		methodName: "execSql"
	};
}

class Api extends EventEmitter {

	async execute( cmd, params ) {
		const callStack = new Error().stack;
		const { text, methodName } = await prepare( cmd );

		return this.withConnection( conn => {
			return new Promise( ( resolve, reject ) => {
				const request = new Request( text, ( err, rowCount ) => {
					if ( err ) {
						return reject( buildError( err, callStack ) );
					}
					return resolve( rowCount );
				} );
				addRequestParams( request, params );
				conn[ methodName ]( request );
			} );
		} );
	}

	async executeBatch( statement ) {
		const callStack = new Error().stack;
		const text = await statement;
		return this.withConnection( conn => {
			return new Promise( ( resolve, reject ) => {
				const request = new Request( text, ( err, rowCount ) => {
					if ( err ) {
						return reject( buildError( err, callStack ) );
					}
					return resolve( rowCount );
				} );

				conn.execSqlBatch( request );
			} );
		} );
	}

	async querySets( cmd, params ) {
		const callStack = new Error().stack;
		const preparedCmd = await prepare( cmd );
		return this.withConnection( async conn => {
			try {
				const sets = await runQuery( conn, preparedCmd, params );
				return sets;
			} catch ( error ) {
				throw buildError( error, callStack );
			}
		} );
	}

	async query( cmd, params ) {
		const callStack = new Error().stack;
		const preparedCmd = await prepare( cmd );
		return this.withConnection( async conn => {
			let sets;
			try {
				sets = await runQuery( conn, preparedCmd, params );
				if ( sets && sets.length > 1 ) {
					throw new Error( "Query returns more than one set of data. Use querySets method to return multiple sets of data." );
				}
				return sets[ 0 ] || [];
			} catch ( error ) {
				throw buildError( error, callStack );
			}
		} );
	}

	async queryFirst( cmd, params ) {
		const callStack = new Error().stack;
		const preparedCmd = await prepare( cmd );
		return this.withConnection( async conn => {
			let sets;
			try {
				sets = await runQuery( conn, preparedCmd, params );

				if ( sets && sets.length > 1 ) {
					throw new Error( "Query returns more than one set of data. Use querySets method to return multiple sets of data." );
				}
				const set = sets[ 0 ] || [];

				return set[ 0 ] || null;
			} catch ( error ) {
				throw buildError( error, callStack );
			}
		} );
	}

	// This implementation is weird because we're getting objects from our internal query
	// TODO: Would we rather listen for the 'columnMetadata' event also and take better control of this?
	async queryValue( cmd, params ) {
		const callStack = new Error().stack;
		const preparedCmd = await prepare( cmd );
		return this.withConnection( async conn => {
			let sets;
			try {
				sets = await runQuery( conn, preparedCmd, params );

				if ( sets && sets.length > 1 ) {
					throw new Error( "Query returns more than one set of data. Use querySets method to return multiple sets of data." );
				}
				const set = sets[ 0 ] || [];
				const row = set[ 0 ] || null;
				if ( row ) {
					// TODO: throw Error if shape of data > 1 property?
					for ( const prop in row ) { // eslint-disable-line guard-for-in
						return row[ prop ];
					}
				}
				return null;
			} catch ( error ) {
				throw buildError( error, callStack );
			}
		} );
	}

	queryStream( cmd, params ) {
		const stream = new RequestStream( );
		this.withConnection( async conn => {
			const { text, methodName } = await prepare( cmd );
			stream.request.sqlTextOrProcedure = text;

			addRequestParams( stream.request, params );

			await new Promise( resolve => {
				stream.on( "close", resolve );
				stream.on( "end", resolve );
				stream.on( "error", resolve ); // An error emitted here has already called stream destroy
				conn[ methodName ]( stream.request );
			} );
		} ).catch( err => {
			stream.destroy( err );
		} );
		return stream;
	}

	bulkLoad( tableName, options ) {
		const callStack = new Error().stack;
		return this.withConnection( async conn => {
			const {
				checkConstraints = false,
				fireTriggers = false,
				keepNulls = false,
				tableLock = false
			} = options;
			const bulk = conn.newBulkLoad(
				tableName,
				{
					checkConstraints,
					fireTriggers,
					keepNulls,
					tableLock
				},
				/* istanbul ignore next: noop */ () => { /* avoiding async promise executor */ }
			);
			addBulkLoadParam( bulk, options.schema );

			if ( options.create ) {
				await this.executeBatch( bulk.getTableCreationSql() );
			}

			return new Promise( ( resolve, reject ) => {
				bulk.callback = function ( err, rowCount ) {
					if ( err ) {
						return reject( buildError( err, callStack ) );
					}
					return resolve( rowCount );
				};
				conn.execBulkLoad( bulk, options.rows );
			} );
		} );
	}

}

Object.assign( Api.prototype, types );

Object.keys( ISOLATION_LEVEL ).forEach( k => {
	Api.prototype[ k.toLowerCase() ] = ISOLATION_LEVEL[ k ];
} );

Api.prototype.fromFile = fileLoader; // leaving this here for backwards compat.
Api.prototype.file = fileLoader;
Api.prototype.sproc = procedure => ( { procedure } );

module.exports = Api;
