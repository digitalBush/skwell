const variableMatcher = /@(\w+)/g;

function makePredicate( expression ) {
	const argNames = [];
	const cleanExprssion = expression.replace( variableMatcher, ( _, name ) => {
		argNames.push( name );
		return `obj["${ name }"]`;
	} );
	return new Function( "obj", `return ${ cleanExprssion }` ); // eslint-disable-line no-new-func
}

function buildTemplate( text ) { // eslint-disable-line max-statements
	const re = /(.*)?[\t ]*--[\t ]*(if|endif|when)[\t ]*?(.*)\n?/g;
	let match = re.exec( text );
	let start = 0;
	const fragments = [];
	const stack = [];

	while ( match !== null ) {
		const [ _, sqlFragment, op, expression ] = match;
		const pre = text.substring( start, match.index );
		let dest = stack.length ? stack[ stack.length - 1 ].fragments : fragments;
		dest.push( () => pre );

		if ( op === "if" ) {
			stack.push( {
				expression,
				fragments: []
			} );
		}

		if ( op === "endif" ) {
			const last = stack.pop();
			if ( !last ) {
				throw new Error( "endif without matching if" );
			}
			dest = stack.length ? stack[ stack.length - 1 ].fragments : fragments;
			const predicate = makePredicate( last.expression );
			dest.push( obj => {
				if ( predicate( obj ) ) {
					return last.fragments.map( x => x( obj ) ).join( "" );
				}
				return "";
			} );
		}

		if ( op === "when" ) {
			const predicate = makePredicate( expression );

			dest.push( obj => {
				if ( predicate( obj ) ) {
					return `${ sqlFragment }\n`;
				}
				return "";
			} );
		}

		start = re.lastIndex;
		match = re.exec( text );
	}
	if ( stack.length ) {
		throw new Error( "if missing closing endif" );
	}
	fragments.push( () => text.substring( start ) );

	return function( obj ) {
		return fragments.map( x => x( obj ) ).join( "" );
	};
}

module.exports	= buildTemplate;
