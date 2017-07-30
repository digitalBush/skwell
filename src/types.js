const { TYPES } = require( "tedious" );

module.exports =
	Object.keys( TYPES ).reduce( ( acc, name ) => {
		const type = TYPES[ name ];
		const key = name.toLowerCase();

		if ( type.maximumLength ) {
			acc[ key ] = length => ( { type, length } );
		} else if ( type.hasPrecision && type.hasScale ) {
			acc[ key ] = ( precision, scale ) => ( { type, precision, scale } );
		} else if ( type.hasScale ) {
			acc[ key ] = scale => ( { type, scale } );
		} else {
			acc[ key ] = { type };
		}

		return acc;
	}, { max: null } );
