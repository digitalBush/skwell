const { TYPES } = require( "tedious" );

class JsonTableType {

	constructor( definition ) {
		this.definition = definition;
	}

	addToRequest( request, paramName, data ) {
		const jsonParamName = `${ paramName }Json`;

		const typeList = typeDeclarations( this.definition );
		const tableDefinition = typeList.map( ( { name, declaration } ) => `[${ name }] ${ declaration }` ).join( "," );
		const jsonPaths = typeList.map( ( { name, declaration } ) => `[${ name }] ${ declaration } '$.${ name }'` ).join( "," );

		const prepend = `
			DECLARE @${ paramName } TABLE (
				${ tableDefinition }
			);
			INSERT INTO @${ paramName }
			SELECT * FROM
			OPENJSON ( @${ jsonParamName } )
			WITH (
				${ jsonPaths }
			);`;

		request.sqlTextOrProcedure = `${ prepend } ${ request.sqlTextOrProcedure }`;

		const json = JSON.stringify( data );
		request.addParameter( jsonParamName, TYPES.NVarChar, json, { length: Infinity } );
	}

}

module.exports = JsonTableType;

function typeDeclarations( definition ) {
	return Object.keys( definition ).map( name => {
		let column = definition[ name ];
		if ( typeof column === "function" ) {
			column = column();
		}
		return {
			name,
			declaration: column.declaration
		};
	} );
}
