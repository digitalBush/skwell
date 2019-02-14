const types = require( "./types" );

const TypeWrapper = require( "./TypeWrapper" );

function typeDeclarations( definition ) {
	return Object.keys( definition ).map( name => {
		let column = definition[ name ];
		if ( typeof column === "function" ) {
			column = column();
		}
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

const defaultTypes = new Map( [
	[ Date, types.datetime ],
	[ Buffer, types.varbinary ]
] );

const nullType = () => new TypeWrapper( types.nvarchar().type );

function getDefaultTypeFor( val ) {
	if ( val === undefined || val === null ) {
		return nullType;
	}

	switch ( typeof val ) {
		case "string":
			return types.nvarchar;

		case "number":
			if ( Number.isInteger( val ) ) {
				return types.int;
			}
			return types.numeric;

		case "boolean":
			return types.bit;

		case "object":
			for ( const [ jsType, sqlType ] of defaultTypes.entries() ) {
				if ( val instanceof jsType ) {
					return sqlType;
				}
			}
			break;
		default:
	}
	return undefined; // No type to map
}

function buildParamUsingDefaultType( val ) {
	const type = getDefaultTypeFor( val );
	if ( type === undefined ) {
		let helpfulOutput = JSON.stringify( val );
		if ( helpfulOutput === undefined ) {
			helpfulOutput = val.toString();
		}
		throw new Error( `Unable to provide a default sql type for ${ typeof( val ) } ${ helpfulOutput }` );
	}

	return {
		type,
		val
	};
}

function buildArrayParamUsingDefaultType( val ) {
	let type = val.reduce( ( acc, x ) => {
		const itemType = getDefaultTypeFor( x );

		if ( itemType === undefined ) {
			let helpfulOutput = JSON.stringify( x );
			if ( helpfulOutput === undefined ) {
				helpfulOutput = x.toString();
			}
			throw new Error( `Unable to provide a default sql type for array item ${ typeof( x ) } ${ helpfulOutput }` );
		}

		if ( itemType === nullType ) {
			return acc;
		}

		if ( acc === null ) {
			return itemType;
		}

		if ( acc !== itemType ) {
			throw new Error( "Unable to provide a default type for array with mixed types" );
		}
		return acc;
	}, null );

	if ( type === null ) {
		type = nullType;
	}

	return {
		type,
		val
	};
}

module.exports = {
	addRequestParams( request, params ) {
		if ( !params ) {
			return;
		}
		Object.keys( params ).forEach( key => {
			let param = params[ key ];

			if ( param === null || param === undefined || ( !param.type && !param.val ) ) {
				if ( Array.isArray( param ) ) {
					param = buildArrayParamUsingDefaultType( param );
				} else {
					param = buildParamUsingDefaultType( param );
				}
			}

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
