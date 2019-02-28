const { readFile } = require( "fs" );
const { promisify } = require( "util" );
const path = require( "path" );

const callsites = require( "callsites" );

const readFileAsync = promisify( readFile );

module.exports = transform => {
	const cache = new Map();
	return async function( relativeFile ) {
		const relativeTo = path.dirname( callsites()[ 1 ].getFileName() );

		if ( path.extname( relativeFile ) === "" ) {
			relativeFile += ".sql";
		}
		const fileName = path.resolve( relativeTo, relativeFile );

		let result = cache.get( fileName );
		if ( !result ) {
			const fileContents = await readFileAsync( fileName, "utf8" );
			result = transform( fileContents );
			cache.set( fileName, result );
		}
		return result;
	};
};
