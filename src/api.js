// eslint-disable-next-line no-redeclare
const { Request, ISOLATION_LEVEL } = require( "tedious" );
const EventEmitter = require( "events" );

const { addRequestParams, addBulkLoadParam } = require( "./parameterBuilder" );
const types = require( "./types" );
const fileLoader = require( "./fileLoader" );
const transformRow = require( "./transformRow" );
const RequestStream = require( "./RequestStream" );

function buildError( error, callStack, depth = 1 ) {
	const capturedStackParts = callStack.split( "\n" ).slice( depth );
	capturedStackParts.unshift( error.toString() );
	error.stack = capturedStackParts.join( "\n" );
	return error;
}

async function runQuery( conn, { text, methodName }, params, opts = {} ) {
	let sets,
		outputParams,
		returnValue,
		rows;

	const { collectData } = opts;

	return new Promise( ( resolve, reject ) => {
		const request = new Request( text, ( err, rowCount ) => {
			if ( err ) {
				return reject( err );
			}
			if ( sets && rows !== undefined ) {
				sets.push( rows );
			}
			return resolve( { sets, outputParams, returnValue, rowCount } );
		} );
		const { hasOutputParams } = addRequestParams( request, params );

		if ( collectData ) {
			sets = [];
			request.on( "columnMetadata", () => {
				if ( rows ) {
					sets.push( rows );
				}
				rows = [];
			} );

			request.on( "row", obj => rows.push( transformRow( obj ) ) );
		}

		if ( hasOutputParams ) {
			request.on( "returnValue", function ( name, value ) {
				if ( !outputParams ) {
					outputParams = {};
				}
				outputParams[ name ] = value;
			} );
		}

		if ( methodName === "callProcedure" ) {
			request.on( "doneProc", function ( _rowCount, _more, statusCode ) {
				returnValue = statusCode;
			} );
		}

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

function assertSingleSet( sets ) {
	if ( sets && sets.length > 1 ) {
		throw new Error( "Query returns more than one set of data. Use querySets method to return multiple sets of data." );
	}
}

class Api extends EventEmitter {

	async querySets( cmd, params ) {
		const transform = ( { sets } ) => sets;
		return this.#run( { cmd, params, transform } );
	}

	async query( cmd, params ) {
		const transform = ( { sets } ) => {
			assertSingleSet( sets );

			return sets[ 0 ] || [];
		};

		return this.#run( { cmd, params, transform } );
	}

	async queryFirst( cmd, params ) {
		const transform = ( { sets } ) => {
			assertSingleSet( sets );

			const set = sets[ 0 ] || [];
			return set[ 0 ] || null;
		};

		return this.#run( { cmd, params, transform } );
	}

	async queryValue( cmd, params ) {
		const transform = ( { sets } ) => {
			assertSingleSet( sets );

			// TODO: enforce <= 1 row and only 1 prop on that row?
			const set = sets[ 0 ] || [];
			const row = set[ 0 ] || null;

			if ( row ) {
				for ( const prop in row ) { // eslint-disable-line guard-for-in
					return row[ prop ];
				}
			}
			return null;
		};

		return this.#run( { cmd, params, transform } );
	}

	async execute( cmd, params ) {
		const transform = ( { rowCount } ) => rowCount;
		return this.#run( { cmd, params, transform, collectData: false } );
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

	queryStream( cmd, params ) {
		const stream = new RequestStream();
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

			if ( !options.rows || options.rows.length === 0 ) {
				return 0;
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

	async #run( { cmd, params, transform, collectData = true } ) {
		const callStack = new Error().stack;
		const preparedCmd = await prepare( cmd );
		return this.withConnection( async conn => {
			const response = await runQuery( conn, preparedCmd, params, { collectData } );
			const result = transform( response );
			const { outputParams, returnValue } = response;

			// Object return mode
			if ( outputParams !== undefined || returnValue !== undefined ) {
				const obj = { result };
				if ( outputParams !== undefined ) {
					obj.outputParams = outputParams;
				}
				if ( returnValue !== undefined ) {
					obj.returnValue = returnValue;
				}
				return obj;
			}
			return result;
		} ).catch( e => {
			throw buildError( e, callStack, 2 );
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
