const types = require( "./types" );

const MIN_SQL_INT = -2_147_483_648;
const MAX_SQL_INT = 2_147_483_647;
const MAX_STRING = 4_000;

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

module.exports = { valueToType };
