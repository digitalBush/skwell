const types = require( "./types" );

const TypeWrapper = require( "./TypeWrapper" );
const TvpType = require( "./TvpType" );

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

	const table = typeList.map( ( { name, declaration } ) => `[${ name }] ${ declaration }` ).join( "," );
	const json = typeList.map( ( { name, declaration } ) => `[${ name }] ${ declaration } '$.${ name }'` ).join( "," );

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

function addTvpParam( request, key, param ) {
	const val = param.type.getVal( param.val );
	request.addParameter( key, param.type.type, val );
}

module.exports = {
	addRequestParams( request, params ) {
		if ( !params ) {
			return false;
		}

		let hasOutputParams = false;

		Object.keys( params ).forEach( key => {
			const param = params[ key ];
			if ( typeof param.type === "function" ) {
				param.type = param.type();
			}

			if ( param.type instanceof TvpType ) {
				addTvpParam( request, key, param );
			} else if ( !Array.isArray( param.val ) ) {
				const { val, type: { type, length, precision, scale }, output = false } = param;
				let method = "addParameter";
				if ( output ) {
					method = "addOutputParameter";
					hasOutputParams = true;
				}

				request[ method ]( key, type, val, { length, precision, scale } );
			} else if ( param.type instanceof TypeWrapper ) {
				addArrayParamExpansion( request, key, param );
			} else {
				addTableParam( request, key, param );
			}
		} );

		return { hasOutputParams };
	},

	addBulkLoadParam( bulk, schema ) {
		Object.keys( schema ).forEach( name => {
			let column = schema[ name ];

			if ( typeof column === "function" ) {
				column = column();
			}
			const { type, length, precision, scale, isNull: nullable } = column;
			bulk.addColumn( name, type, { length, precision, scale, nullable: !!nullable } );
		} );
	}
};
