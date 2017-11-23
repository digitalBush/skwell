module.exports = class TypeWrapper {

	constructor( type, opts ) {
		this.type = type;
		if ( opts ) {
			Object.keys( opts ).forEach( k => {
				this[ k ] = opts[ k ];
			} );
		}
	}

	nullable( val = true ) {
		this.isNull = val;
		return this;
	}

};
