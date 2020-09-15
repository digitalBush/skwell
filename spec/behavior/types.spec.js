const { expect } = testHelpers;
const types = require( "src/types" );
const TvpType = require( "src/TvpType" );

describe( "types", () => {
	[
		"bigint",
		"bit",
		"date",
		"datetime",
		"image",
		"int",
		"float",
		"money",
		"ntext",
		"real",
		"smalldatetime",
		"smallint",
		"smallmoney",
		"text",
		"tinyint",
		"udt",
		"uniqueidentifier",
		"variant",
		"xml"
	].forEach( name => {
		it( `should create wrapper for ${ name } type`, () => {
			const wrappedType = types[ name ]();
			wrappedType.type.name.toLowerCase().should.equal( name );
		} );

		it( `should declare ${ name } type`, () => {
			const wrappedType = types[ name ]();
			wrappedType.declaration.should.equal( name );
		} );
	} );

	describe( "with length", () => {
		[
			{ name: "binary", emptyValue: 8000 },
			{ name: "char", emptyValue: 8000 },
			{ name: "nchar", emptyValue: 4000 },
			{ name: "nvarchar", emptyValue: 4000, max: true },
			{ name: "varbinary", emptyValue: 8000, max: true },
			{ name: "varchar", emptyValue: 8000, max: true }
		].forEach( ( { name, emptyValue, max } ) => {
			describe( name, () => {
				it( "should create wrapper with proper type", () => {
					const wrappedType = types[ name ]( 1 );
					wrappedType.type.name.toLowerCase().should.equal( name );
				} );

				it( "should use provided length", () => {
					const wrappedType = types[ name ]( 42 );
					wrappedType.length.should.equal( 42 );
				} );

				it( "should declare type with length", () => {
					const wrappedType = types[ name ]( 42 );
					wrappedType.declaration.should.equal( `${ name }(42)` );
				} );

				it( "should use default length", () => {
					const wrappedType = types[ name ]();
					wrappedType.length.should.equal( emptyValue );
				} );

				it( "should declare type with default length", () => {
					const wrappedType = types[ name ]();
					wrappedType.declaration.should.equal( `${ name }(${ emptyValue })` );
				} );

				if ( max ) {
					it( "should use max length", () => {
						const wrappedType = types[ name ]( types.max );
						expect( wrappedType.length ).to.be.null();
						wrappedType.max.should.equal( true );
					} );

					it( "should declare type with max length", () => {
						const wrappedType = types[ name ]( types.max );
						wrappedType.declaration.should.equal( `${ name }(max)` );
					} );

					it( `should have ${ name }_max type`, () => {
						const wrappedType = types[ `${ name }_max` ];
						expect( wrappedType.length ).to.be.null();
						wrappedType.max.should.equal( true );
					} );

					it( `should declare type ${ name }_max with max length`, () => {
						const wrappedType = types[ `${ name }_max` ];
						wrappedType.declaration.should.equal( `${ name }(max)` );
					} );
				}
			} );
		} );
	} );

	describe( "with scale", () => {
		[
			{ name: "datetime2", emptyValue: 7 },
			{ name: "datetimeoffset", emptyValue: 7 },
			{ name: "time", emptyValue: 7 }
		].forEach( ( { name, emptyValue } ) => {
			describe( name, () => {
				it( "should create wrapper with proper type", () => {
					const wrappedType = types[ name ]( 1 );
					wrappedType.type.name.toLowerCase().should.equal( name );
				} );

				it( "should use provided scale", () => {
					const wrappedType = types[ name ]( 5 );
					wrappedType.scale.should.equal( 5 );
				} );

				it( "should declare type with scale", () => {
					const wrappedType = types[ name ]( 42 );
					wrappedType.declaration.should.equal( `${ name }(42)` );
				} );

				it( "should use default scale", () => {
					const wrappedType = types[ name ]();
					wrappedType.scale.should.equal( emptyValue );
				} );

				it( "should declare type with default scale", () => {
					const wrappedType = types[ name ]( );
					wrappedType.declaration.should.equal( `${ name }(${ emptyValue })` );
				} );
			} );
		} );
	} );

	describe( "with precision and scale", () => {
		[
			{ name: "decimal", emptyPrecision: 18, emptyScale: 0 },
			{ name: "numeric", emptyPrecision: 18, emptyScale: 0 }
		].forEach( ( { name, emptyPrecision, emptyScale } ) => {
			describe( name, () => {
				it( "should create wrapper with proper type", () => {
					const wrappedType = types[ name ]( 2, 1 );
					wrappedType.type.name.toLowerCase().should.equal( name );
				} );

				it( "should use provided precision and scale", () => {
					const wrappedType = types[ name ]( 5, 1 );
					wrappedType.precision.should.equal( 5 );
					wrappedType.scale.should.equal( 1 );
				} );

				it( "should declare type with precision and scale", () => {
					const wrappedType = types[ name ]( 5, 1 );
					wrappedType.declaration.should.equal( `${ name }(5,1)` );
				} );

				it( "should use defaults", () => {
					const wrappedType = types[ name ]();
					wrappedType.precision.should.equal( emptyPrecision );
					wrappedType.scale.should.equal( emptyScale );
				} );


				it( "should declare type with default precision and scale", () => {
					const wrappedType = types[ name ]();
					wrappedType.declaration.should.equal( `${ name }(${ emptyPrecision },${ emptyScale })` );
				} );
			} );
		} );
	} );

	describe( "tvp", () => {
		let tvp;
		before( () => {
			tvp = types.tvp( {
				a: types.bigint,
				b: types.nvarchar( 30 ),
				c: types.numeric( 3, 1 )
			} );
		} );

		it( "should create a wrapper for tvp type", () => {
			tvp.should.be.instanceof( TvpType );
		} );

		it( "should return tedious type", () => {
			tvp.type.name.should.equal( "TVP" );
		} );

		it( "should return correct value", () => {
			const val = tvp.getVal( [
				{ a: "1", b: "yo", c: 42 },
				{ b: "hi", a: "2", c: 1.23 },
				{ a: "3" }
			] );

			val.columns.should.deep.equal( [
				{
					name: "a",
					type: types.bigint().type,
					length: undefined,
					precision: undefined,
					scale: undefined
				},
				{
					name: "b",
					type: types.nvarchar( 30 ).type,
					length: 30,
					precision: undefined,
					scale: undefined
				},
				{
					name: "c",
					type: types.numeric( 3, 1 ).type,
					length: undefined,
					precision: 3,
					scale: 1
				}
			] );

			val.rows.should.deep.equal( [
				[ "1", "yo", 42 ],
				[ "2", "hi", 1.23 ],
				[ "3", null, null ]
			] );
		} );
	} );
} );
