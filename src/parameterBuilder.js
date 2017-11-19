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

function addArrayParamExpansion( request, key, param ) {
	const matcher = new RegExp( `(\\(\\s*@${ key }\\s*\\))|@${ key }\\b`, "ig" );
	if ( param.val.length === 0 ) {
		request.sqlTextOrProcedure = request.sqlTextOrProcedure.replace( matcher, "(SELECT 1 WHERE 1=0)" );
		return;
	}

	const { type: { type, length, precision, scale } } = param;

	const params = [];
	let i = 0;
	for ( const item of param.val ) {
		const itemName = `${ key }${ i++ }`;
		request.addParameter( itemName, type, item, { length, precision, scale } );
		params.push( `@${ itemName }` );
	}
	request.sqlTextOrProcedure = request.sqlTextOrProcedure.replace( matcher, `(${ params.join( "," ) })` );
}

function addTableParam( request, key, param ) {
	const typeList = typeDeclarations( param.type );

	const table = typeList.map( ( { name, declaration } ) => `${ name } ${ declaration }` ).join( "," );
	const json = typeList.map( ( { name, declaration } ) => `${ name } ${ declaration } '$.${ name }'` ).join( "," );

	const prepend = `
		DECLARE @${ key } TABLE (
			${ table }
		);
		INSERT INTO @${ key }
		SELECT * FROM
		OPENJSON ( @${ key }Json )
		WITH (
			${ json }
		);`;

	const name = `${ key }Json`;
	const type = types.nvarchar();
	const val = JSON.stringify( param.val );

	request.sqlTextOrProcedure = `${ prepend } ${ request.sqlTextOrProcedure }`;
	request.addParameter( name, type.type, val );
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

		if ( !Array.isArray( param.val ) ) {
			const { val, type: { type, length, precision, scale } } = param;
			request.addParameter( key, type, val, { length, precision, scale } );
		} else if ( param.type instanceof TypeWrapper ) {
			addArrayParamExpansion( request, key, param );
		} else {
			addTableParam( request, key, param );
		}
	} );
};
