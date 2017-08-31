const types = require( "./types" );

const TypeWrapper = require( "./TypeWrapper" );

function typeDeclarations( definition ) {
	return Object.keys( definition ).map( name => {
		const column = definition[ name ];
		const declaration = column.type.declaration( column );
		return {
			name,
			declaration
		};
	} );
}

function buildArrayParam( key, param ) {
	const typeList = typeDeclarations( param.type );

	const table = typeList.map( ( { name, declaration } ) => `${ name } ${ declaration }` ).join( "," );
	const json = typeList.map( ( { name, declaration } ) => `${ name } ${ declaration } '$.${ name }'` ).join( "," );

	param.name = `${ key }Json`;
	param.prepend = `
		DECLARE @${ key } TABLE (
			${ table }
		);
		INSERT INTO @${ key }
		SELECT * FROM
 			OPENJSON ( @${ key }Json )
			WITH (
				${ json }
 			);
	`;
	param.type = types.nvarchar( types.max );
	param.val = JSON.stringify( param.val );
}

module.exports = function( request, params ) {
	if ( !params ) {
		return;
	}
	Object.keys( params ).forEach( key => {
		const param = params[ key ];
		if ( typeof param.type === "function" ) {
			param.type = param.type();
		}

		if ( Array.isArray( param.val ) ) {
			// Value array is converted to Object array with a single property `value`
			if ( param.type instanceof TypeWrapper ) {
				param.type = { value: param.type };
				param.val = param.val.map( value => ( { value } ) );
			}
			buildArrayParam( key, param );
			request.sqlTextOrProcedure = `${ param.prepend } ${ request.sqlTextOrProcedure }`;
		}

		const { name, val, type: { type, length, precision, scale } } = param;
		request.addParameter( name || key, type, val, { length, precision, scale } );
	} );
};
