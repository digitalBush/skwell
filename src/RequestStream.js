const { Readable } = require( "readable-stream" );
const { Request } = require( "tedious" );

const transformRow = require( "./transformRow" );

const _request = Symbol( "skwell:stream" );

class RequestStream extends Readable {

	constructor( sql ) {
		super( {
			objectMode: true
		} );

		const request = new Request( sql, err => {
			if ( err ) {
				this.destroy( err );
			}
			this.push( null );
		} );

		request.on( "columnMetadata", columns => {
			this.push( { metadata: {
				columnNames: columns.map( ( { colName } ) => colName )
			} } );
		} );

		request.on( "row", obj => {
			const keepGoing = this.push( { row: transformRow( obj ) } );
			if ( !keepGoing ) {
				request.pause();
			}
		} );

		this[ _request ] = request;
	}

	_read() {
		this[ _request ].resume();
	}

	_destroy( err, cb ) {
		this[ _request ].connection.cancel();
		cb( err );
	}

	get request() {
		return this[ _request ];
	}

}

module.exports = RequestStream;
