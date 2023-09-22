const { TYPES } = require( "tedious" );
class TvpType {

	constructor( typeName, cols ) {
		this.typeName = typeName;
		this.cols = cols;
	}

	addToRequest( request, paramName, data ) {
		const props = [];
		const columns = [];

		Object.keys( this.cols ).forEach( name => {
			let wrappedType = this.cols[ name ];
			if ( typeof( wrappedType ) === "function" ) {
				wrappedType = wrappedType();
			}

			const { type, length, precision, scale } = wrappedType;
			columns.push( { name, type, length, precision, scale } );
			props.push( name );
		} );

		const val = {
			name: this.typeName,
			columns,
			rows: data.map( o => props.map( p => o[ p ] || null ) )
		};
		request.addParameter( paramName, TYPES.TVP, val );
	}

}

module.exports = TvpType;
