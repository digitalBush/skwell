const { Request, ISOLATION_LEVEL } = require( "tedious" );

const { addRequestParams, addBulkLoadParam } = require( "./parameterBuilder" );
const types = require( "./types" );
const fileLoader = require( "./fileLoader" );
const transformRow = require( "./transformRow" );
const RequestStream = require( "./RequestStream" );

class Api {

	async execute( sql, params ) {
		const _sql = await sql;
		return this.withConnection( conn => {
			return new Promise( ( resolve, reject ) => {
				const request = new Request( _sql, ( err, rowCount ) => {
					if ( err ) {
						return reject( err );
					}
					return resolve( rowCount );
				} );
				addRequestParams( request, params );
				conn.execSql( request );
			} );
		} );
	}

	async executeBatch( sql ) {
		const _sql = await sql;
		return this.withConnection( conn => {
			return new Promise( ( resolve, reject ) => {
				const request = new Request( _sql, ( err, rowCount ) => {
					if ( err ) {
						return reject( err );
					}
					return resolve( rowCount );
				} );

				conn.execSqlBatch( request );
			} );
		} );
	}

	async querySets( sql, params ) {
		const _sql = await sql;
		return this.withConnection( conn => {
			const sets = [];
			let rows;
			return new Promise( ( resolve, reject ) => {
				const request = new Request( _sql, err => {
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
		} );
	}

	async query( sql, params ) {
		const sets = await this.querySets( sql, params );
		if ( sets && sets.length > 1 ) {
			throw new Error( "Query returns more than one set of data. Use querySets method to return multiple sets of data." );
		}
		return sets[ 0 ] || [];
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

	async queryFirst( sql, params ) {
		const result = await this.query( sql, params );
		// TODO: throw Error if shape of data > 1 row?
		return result[ 0 ] || null;
	}

	// This implementation is weird because we're letting tedious pull objects.
	// Would we rather listen for the 'columnMetadata' event also and take better control of this?
	async queryValue( sql, params ) {
		const result = await this.queryFirst( sql, params );
		// TODO: throw Error if shape of data > 1 property?
		if ( result ) {
			for ( const prop in result ) { // eslint-disable-line guard-for-in
				return result[ prop ];
			}
		}
		return null;
	}

	bulkLoad( tableName, options ) {
		return this.withConnection( async conn => {
			const bulk = conn.newBulkLoad( tableName );
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
						return reject( err );
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
