const { readFile } = require( "fs" );
const { promisify } = require( "util" );
const path = require( "path" );

const callsites = require( "callsites" );

const readFileAsync = promisify( readFile );
const cache = new Map();

module.exports = async function( relativeFile ) {
	const relativeTo = path.dirname( callsites()[ 1 ].getFileName() );

	if ( path.extname( relativeFile ) === "" ) {
		relativeFile += ".sql";
	}
	const fileName = path.resolve( relativeTo, relativeFile );

	let result = cache.get( fileName );
	if ( !result ) {
		result = await readFileAsync( fileName, "utf8" );
		cache.set( fileName, result );
	}
	return result;
};
