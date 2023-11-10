const { readFile } = require( "node:fs/promises" );
const path = require( "node:path" );
const { fileURLToPath } = require( "node:url" );

const callsites = require( "callsites" );

const cache = new Map();

module.exports = async function( relativeFile ) {
	let callerFileName = callsites()[ 1 ].getFileName();

	if ( callerFileName.startsWith( "file://" ) ) {
		// ESM
		callerFileName = fileURLToPath( callerFileName );
	}
	const relativeTo = path.dirname( callerFileName );
	if ( path.extname( relativeFile ) === "" ) {
		relativeFile += ".sql";
	}
	const fileName = path.resolve( relativeTo, relativeFile );

	let result = cache.get( fileName );
	if ( !result ) {
		result = await readFile( fileName, "utf8" );
		cache.set( fileName, result );
	}
	return result;
};
