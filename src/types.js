const { TYPES } = require( "tedious" );

const TypeWrapper = require( "./TypeWrapper" );

module.exports =
	Object.keys( TYPES ).reduce( ( acc, name ) => {
		if ( name.endsWith( "N" ) ) {
			// Stop warnings introduced when upgrading to tedious 2.6.1.
			// This can be removed when these types are removed from tedious.
			return acc;
		}

		const type = TYPES[ name ];
		const key = name.toLowerCase();

		if ( type.maximumLength ) {
			acc[ key ] = length => new TypeWrapper( type, { length } );
		} else if ( type.hasPrecision && type.hasScale ) {
			acc[ key ] = ( precision, scale ) => new TypeWrapper( type, { precision, scale } );
		} else if ( type.hasScale ) {
			acc[ key ] = scale => new TypeWrapper( type, { scale } );
		} else {
			acc[ key ] = () => new TypeWrapper( type );
		}

		acc[ key ].nullable = function( val ) {
			return acc[ key ]().nullable( val );
		};

		return acc;
	}, { max: null } );
