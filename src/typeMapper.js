const types = require( "./types" );

const MAX_SQL_INT = 2147483647;
const MIN_SQL_INT = -2147483648;
const MAX_STRING = 4000;

function missingType( val ) {
	if ( val === null || val === undefined ) {
		return true;
	}

	return !val.hasOwnProperty( "type" ) || !val.hasOwnProperty( "val" );
}

function valueToType( val ) {
	if ( val === null || val === undefined ) {
		return types.nvarchar( 1 );
	}

	switch ( typeof( val ) ) {
		case "boolean":
			return types.bit;

		case "string":
			return types.nvarchar( val.length > MAX_STRING ? types.max : val.length );

		case "number":
			if ( val % 1 === 0 ) {
				if ( val > MIN_SQL_INT && val < MAX_SQL_INT ) {
					return types.int;
				}
				return types.bigint;
			}
			return types.float;

		case "bigint":
			return types.bigint;

		case "object":
			if ( val instanceof Date ) {
				return types.datetime2;
			}

		// eslint-disable-next-line no-fallthrough
		default:
			throw new Error( "cannot infer type" );
	}
}

function isObj( obj ) {
	if ( typeof obj !== "object" || obj === null ) {
		return false;
	}

	return Object.getPrototypeOf( obj ) === Object.prototype;
}

module.exports = { missingType, valueToType, isObj };
