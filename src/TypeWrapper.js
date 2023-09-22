const max = Symbol( "skwell:max" );

class TypeWrapper {

	constructor( type, opts ) {
		this.type = type;

		if ( opts ) {
			Object.keys( opts ).forEach( k => {
				this[ k ] = opts[ k ];
			} );
		}
		if ( this.length === max ) {
			this.length = null;
			this.max = true;
		}
	}

	nullable( val = true ) {
		this.isNull = val;
		return this;
	}

	get declaration() {
		const typeName = this.type.name.toLowerCase();
		if ( this.hasOwnProperty( "length" ) ) {
			const val = this.max ? "max" : this.length;
			return `${ typeName }(${ val })`;
		} else if ( this.hasOwnProperty( "precision" ) && this.hasOwnProperty( "scale" ) ) {
			return `${ typeName }(${ this.precision },${ this.scale })`;
		} else if ( this.hasOwnProperty( "scale" ) ) {
			return `${ typeName }(${ this.scale })`;
		}
		return typeName;
	}

	static get max() {
		return max;
	}

	addToRequest( request, paramName, data ) {
		const { type, length, precision, scale } = this;

		// Single param value
		if ( !Array.isArray( data ) ) {
			request.addParameter( paramName, type, data, { length, precision, scale } );
			return;
		}

		// Array valued param.
		const matcher = new RegExp( `(\\(\\s*@${ paramName }\\s*\\))|@${ paramName }\\b`, "ig" );

		// If there are no items, we inject a subquery that returns no data.
		if ( data.length === 0 ) {
			request.sqlTextOrProcedure = request.sqlTextOrProcedure.replace( matcher, "(SELECT 1 WHERE 1=0)" );
			return;
		}

		// Generate one param per array item.
		const params = [];
		let i = 0;
		for ( const item of data ) {
			const itemName = `${ paramName }${ i++ }`;
			request.addParameter( itemName, type, item, { length, precision, scale } );
			params.push( `@${ itemName }` );
		}
		request.sqlTextOrProcedure = request.sqlTextOrProcedure.replace( matcher, `(${ params.join( "," ) })` );
	}

}


module.exports = TypeWrapper;
