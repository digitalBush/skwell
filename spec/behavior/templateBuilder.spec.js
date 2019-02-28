const { expect } = testHelpers;

const templateBuilder = require( "src/templateBuilder" );

describe( "templateBuilder", () => {
	describe( "if", () => {
		let template;
		before( async () => {
			template = await templateBuilder( `
				SELECT *
				FROM lol
				WHERE 1=1
				-- if @foo
					AND 2=2
				-- endif
				-- if @bar
					-- hi!
					-- if @ham
					AND 3=3
					-- endif
				-- endif
				AND 5=5` );
		} );

		function runTest( data, expected ) {
			const output = template( data );
			const actual = output.split( "\n" ).map( x => x.trim() ).join( "\n" );
			expected = expected.split( "\n" ).map( x => x.trim() ).join( "\n" );
			actual.should.equal( expected );
		}

		const truthy = [
			true,
			1,
			1.1,
			new Date(),
			"yay",
			[ ]
		];
		truthy.forEach( hasValue => {
			it( `should include fragment if expression evaluates ${ JSON.stringify( hasValue ) }`, () => {
				runTest( { foo: hasValue }, `
				SELECT *
				FROM lol
				WHERE 1=1
				AND 2=2
				AND 5=5` );
			} );
		} );

		const falsey = [
			false,
			0,
			null,
			undefined
		];
		falsey.forEach( noValue => {
			it( `should NOT include fragment if expression evaluates ${ JSON.stringify( noValue ) }`, () => {
				runTest( { foo: noValue }, `
			SELECT *
			FROM lol
			WHERE 1=1
			AND 5=5` );
			} );
		} );

		it( "should include fragment if expression evaluates true, but exclude unmatched inner fragments", () => {
			runTest( { bar: true }, `
				SELECT *
				FROM lol
				WHERE 1=1
				-- hi!
				AND 5=5` );
		} );

		it( "should include inner fragment if both inner and outer expressions are true", () => {
			runTest( { bar: true, ham: true }, `
				SELECT *
				FROM lol
				WHERE 1=1
				-- hi!
				AND 3=3
				AND 5=5` );
		} );

		it( "should exclude inner fragment if outer expression is false and inner expression is true", () => {
			runTest( { bar: false, ham: true }, `
				SELECT *
				FROM lol
				WHERE 1=1
				AND 5=5` );
		} );
	} );

	describe( "when", () => {
		let template;
		before( async () => {
			template = await templateBuilder( `
				SELECT *
				FROM lol
				WHERE 1=1
				AND 2=2 -- when @foo
				-- if @bar
					-- hi!
					AND 3=3 -- when @ham
				-- endif
				AND 5=5` );
		} );

		function runTest( data, expected ) {
			const output = template( data );
			const actual = output.split( "\n" ).map( x => x.trim() ).join( "\n" );
			expected = expected.split( "\n" ).map( x => x.trim() ).join( "\n" );
			actual.should.equal( expected );
		}

		const truthy = [
			true,
			1,
			1.1,
			new Date(),
			"yay",
			[ ]
		];
		truthy.forEach( hasValue => {
			it( `should include fragment if expression evaluates ${ JSON.stringify( hasValue ) }`, () => {
				runTest( { foo: hasValue }, `
				SELECT *
				FROM lol
				WHERE 1=1
				AND 2=2
				AND 5=5` );
			} );
		} );

		const falsey = [
			false,
			0,
			null,
			undefined
		];
		falsey.forEach( noValue => {
			it( `should NOT include fragment if expression evaluates ${ JSON.stringify( noValue ) }`, () => {
				runTest( { foo: noValue }, `
			SELECT *
			FROM lol
			WHERE 1=1
			AND 5=5` );
			} );
		} );

		it( "should include inner fragment if both inner and outer expressions are true", () => {
			runTest( { bar: true, ham: true }, `
				SELECT *
				FROM lol
				WHERE 1=1
				-- hi!
				AND 3=3
				AND 5=5` );
		} );

		it( "should exclude inner fragment if outer expression is false and inner expression is true", () => {
			runTest( { bar: false, ham: true }, `
				SELECT *
				FROM lol
				WHERE 1=1
				AND 5=5` );
		} );
	} );

	describe( "bad templates", () => {
		it( "should error when template has more ifs than endifs", () => {
			expect( () => templateBuilder( "--if" ) ).to.throw( "if missing closing endif" );
		} );
		it( "should error when template has more endifs than ifs", () => {
			expect( () => templateBuilder( "--endif" ) ).to.throw( "endif without matching if" );
		} );
	} );
} );
