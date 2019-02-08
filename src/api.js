const { Request, ISOLATION_LEVEL } = require( "tedious" );

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

async function _query( conn, sql, params ) {
	const sets = [];
	let rows;
	return new Promise( ( resolve, reject ) => {
		const request = new Request( sql, err => {
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
		conn.execSql( request );
	} );
}

class Api {

	async execute( sql, params ) {
		const callStack = new Error().stack;
		const _sql = await sql;
		return this.withConnection( conn => {
			return new Promise( ( resolve, reject ) => {
				const request = new Request( _sql, ( err, rowCount ) => {
					if ( err ) {
						return reject( buildError( err, callStack ) );
					}
					return resolve( rowCount );
				} );
				addRequestParams( request, params );
				conn.execSql( request );
			} );
		} );
	}

	async executeBatch( sql ) {
		const callStack = new Error().stack;
		const _sql = await sql;
		return this.withConnection( conn => {
			return new Promise( ( resolve, reject ) => {
				const request = new Request( _sql, ( err, rowCount ) => {
					if ( err ) {
						return reject( buildError( err, callStack ) );
					}
					return resolve( rowCount );
				} );

				conn.execSqlBatch( request );
			} );
		} );
	}

	async querySets( sql, params ) {
		const callStack = new Error().stack;
		const _sql = await sql;
		return this.withConnection( async conn => {
			try {
				const sets = await _query( conn, _sql, params );
				return sets;
			} catch ( error ) {
				throw buildError( error, callStack );
			}
		} );
	}

	async query( sql, params ) {
		const callStack = new Error().stack;
		const _sql = await sql;
		return this.withConnection( async conn => {
			let sets;
			try {
				sets = await _query( conn, _sql, params );
				if ( sets && sets.length > 1 ) {
					throw new Error( "Query returns more than one set of data. Use querySets method to return multiple sets of data." );
				}
				return sets[ 0 ] || [];
			} catch ( error ) {
				throw buildError( error, callStack );
			}
		} );
	}

	async queryFirst( sql, params ) {
		const callStack = new Error().stack;
		const _sql = await sql;
		return this.withConnection( async conn => {
			let sets;
			try {
				sets = await _query( conn, _sql, params );

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
	async queryValue( sql, params ) {
		const callStack = new Error().stack;
		const _sql = await sql;
		return this.withConnection( async conn => {
			let sets;
			try {
				sets = await _query( conn, _sql, params );

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

	queryStream( sql, params ) {
		const stream = new RequestStream( );
		this.withConnection( async conn => {
			const _sql = await sql;
			stream.request.sqlTextOrProcedure = _sql;

			addRequestParams( stream.request, params );

			await new Promise( resolve => {
				stream.on( "end", resolve );
				stream.on( "error", resolve ); // Resolving here because there's no returned promise to catch these errors.
				conn.execSql( stream.request );
			} );
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

			for ( const row of options.rows ) {
				bulk.addRow( row );
			}

			return new Promise( ( resolve, reject ) => {
				bulk.callback = function ( err, rowCount ) {
					if ( err ) {
						return reject( buildError( err, callStack ) );
					}
					return resolve( rowCount );
				};
				conn.execBulkLoad( bulk );
			} );
		} );
	}

}

Object.assign( Api.prototype, types );

Object.keys( ISOLATION_LEVEL ).forEach( k => {
	Api.prototype[ k.toLowerCase() ] = ISOLATION_LEVEL[ k ];
} );

Api.prototype.fromFile = fileLoader;

module.exports = Api;
