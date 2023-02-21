const { expect } = testHelpers;
const { valueToType } = require( "src/typeMapper" );
const types = require( "src/types" );

describe( "typeMapper", () => {
	it( "should map null", () => {
		valueToType( null ).should.deep.equal( types.nvarchar( 1 ) );
	} );

	it( "should map undefined", () => {
		valueToType( undefined ).should.deep.equal( types.nvarchar( 1 ) );
	} );

	it( "should map booleans", () => {
		valueToType( true ).should.equal( types.bit );
	} );

	it( "should map strings", () => {
		valueToType( "🤠" ).should.deep.equal( types.nvarchar( 2 ) );
	} );

	it( "should map long strings", () => {
		valueToType( "!".repeat( 5000 ) ).should.deep.equal( types.nvarchar_max );
	} );

	it( "should map floats", () => {
		valueToType( 1.23 ).should.equal( types.float );
	} );

	it( "should map ints", () => {
		valueToType( 1 ).should.equal( types.int );
	} );

	it( "should map big numbers as bigints", () => {
		valueToType( 9876543210 ).should.equal( types.bigint );
	} );

	it( "should map bigints", () => {
		valueToType( 9876543210n ).should.equal( types.bigint );
	} );

	it( "should map dates", () => {
		valueToType( new Date() ).should.equal( types.datetime2 );
	} );

	it( "should fail on unknown types", () => {
		expect( () => valueToType( Symbol( "lol" ) ) ).to.throw( "cannot infer type" );
	} );

	[
		[ 1, 2, 3 ],
		{},
		new Set(),
		new Map()
	].forEach( obj => {
		it( `should fail on unknown object:${ obj.toString() }`, () => {
			expect( () => valueToType( obj ) ).to.throw( "cannot infer type" );
		} );
	} );
} );
