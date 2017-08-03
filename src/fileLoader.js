const { readFile } = require( "fs" );
const { promisify } = require( "util" );
const path = require( "path" );

const callsites = require( "callsites" );

const readFileAsync = promisify( readFile );
const cache = {};

module.exports = function( relativeFile ) {
	const relativeTo = path.dirname( callsites()[ 1 ].getFileName() );

	if ( path.extname( relativeFile ) === "" ) {
		relativeFile += ".sql";
	}
	const fileName = path.resolve( relativeTo, relativeFile );

	let result = cache[ fileName ];
	if ( !result ) {
		result = cache[ fileName ] = readFileAsync( relativeFile, "utf8" );
	}
	return result;
};
