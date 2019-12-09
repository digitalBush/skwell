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

}


module.exports = TypeWrapper;
