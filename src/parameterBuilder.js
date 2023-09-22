const JsonTableType = require( "./JsonTableType" );
const { missingType, valueToType, isObj } = require( "./typeMapper" );

module.exports = {
	addRequestParams( request, params ) {
		if ( !params ) {
			return;
		}

		Object.keys( params ).forEach( key => {
			let param = params[ key ];

			// Infer type
			if ( missingType( param ) ) {
				param = {
					val: param,
					type: valueToType( param )
				};
			}

			// Missing length/precision/scale, use defaults
			if ( typeof param.type === "function" ) {
				param.type = param.type();
			}

			// Assume type:{...} is a JSON based table param
			if ( isObj( param.type ) ) {
				param.type = new JsonTableType( param.type );
			}

			const { type, val } = param;
			if ( !type.addToRequest ) {
				throw new Error( `Parameter ${ key } has invalid type.` );
			}
			type.addToRequest( request, key, val );
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
