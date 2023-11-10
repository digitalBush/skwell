const { TYPES } = require( "tedious" );
class TvpType {

	constructor( name, cols ) {
		this.name = name;
		this.cols = cols;
	}

	get type() {
		return TYPES.TVP;
	}

	getVal( data ) {
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

		return {
			name: this.name,
			columns,
			rows: data.map( o => props.map( p => o[ p ] || null ) )
		};
	}

}

module.exports = TvpType;
