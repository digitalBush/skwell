const { sinon, expect } = testHelpers;

const parameterBuilder = require( "src/parameterBuilder" );
const types = require( "src/types" );

describe( "parameterBuilder", () => {
	function getRequest( sql ) {
		return {
			addParameter: sinon.stub(),
			sqlTextOrProcedure: sql || ""
		};
	}
	[
		{ name: "no parens", sql: "SELECT * FROM lol WHERE foo in @bars" },
		{ name: "parens, no spaces", sql: "SELECT * FROM lol WHERE foo in (@bars)" },
		{ name: "parens and spaces", sql: "SELECT * FROM lol WHERE foo in ( @bars )" }
	].forEach( scenario => {
		it( `should expand array params: ${ scenario.name }`, () => {
			const expectedType = types.int().type;
			const expectedTypeOptions = { length: undefined, precision: undefined, scale: undefined };

			const req = getRequest( scenario.sql );

			parameterBuilder.addRequestParams( req, {
				bars: {
					val: [ 1, 2, 3 ],
					type: types.int
				}
			} );

			req.sqlTextOrProcedure.should.equal( "SELECT * FROM lol WHERE foo in (@bars0,@bars1,@bars2)" );

			req.addParameter.should.be.calledThrice()
				.and.calledWithExactly( "bars0", expectedType, 1, expectedTypeOptions )
				.and.calledWithExactly( "bars1", expectedType, 2, expectedTypeOptions )
				.and.calledWithExactly( "bars2", expectedType, 3, expectedTypeOptions );
		} );
	} );

	it( "should provide empty set sql when expanding params on an empty list", () => {
		const req = getRequest( "SELECT * FROM lol WHERE foo in @bars" );

		parameterBuilder.addRequestParams( req, {
			bars: {
				val: [ ],
				type: types.int
			}
		} );

		req.sqlTextOrProcedure.should.equal( "SELECT * FROM lol WHERE foo in (SELECT 1 WHERE 1=0)" );

		req.addParameter.should.not.be.called();
	} );


	[
		{ val: "hi", expectedType: types.nvarchar },
		{ val: 1, expectedType: types.int },
		{ val: 1.1, expectedType: types.numeric },
		{ val: true, expectedType: types.bit },
		{ val: false, expectedType: types.bit },
		{ val: new Date(), expectedType: types.datetime },
		{ val: Buffer.from( [ 0x0 ] ), expectedType: types.varbinary },
		{ val: undefined, expectedType: types.nvarchar },
		{ val: null, expectedType: types.nvarchar }
	].forEach( ( { val, expectedType } ) => {
		it( `should map type for ${ typeof val }`, () => {
			const req = getRequest( "insert into lol values (@a)" );

			parameterBuilder.addRequestParams( req, {
				a: val
			} );

			req.addParameter.should.be.calledOnce()
				.and.calledWith( "a", expectedType().type, val );
		} );
	} );

	[
		{ val: [ "hi", "bye" ], expectedType: types.nvarchar },
		{ val: [ 1, 2, 3, null ], expectedType: types.int },
		{ val: [ ], expectedType: types.nvarchar }
	].forEach( ( { val, expectedType } ) => {
		it( `should map types for array ${ val }`, () => {
			const req = getRequest( "insert into lol values (@a)" );

			parameterBuilder.addRequestParams( req, {
				a: val
			} );

			req.addParameter.should.have.callCount( val.length );
			for ( let i = 0; i < val.length; i++ ) {
				req.addParameter.should.be.calledWith( `a${ i }`, expectedType().type, val[ i ] );
			}
		} );
	} );

	it( "should error when mapping type for unknown type", () => {
		const req = getRequest( "insert into lol values (@a)" );

		expect( () => {
			parameterBuilder.addRequestParams( req, {
				a() {}
			} );
		} ).to.throw( "Unable to provide a default sql type for function a() {}" );

		req.addParameter.should.not.be.called();
	} );

	it( "should error when mapping type for unknown object", () => {
		const req = getRequest( "insert into lol values (@a)" );

		expect( () => {
			parameterBuilder.addRequestParams( req, {
				a: { hi: true, go: "boom" }
			} );
		} ).to.throw( "Unable to provide a default sql type for object {\"hi\":true,\"go\":\"boom\"}" );

		req.addParameter.should.not.be.called();
	} );

	it( "should error when mapping types for unknown type in array", () => {
		const req = getRequest( "insert into lol values (@a)" );

		expect( () => {
			parameterBuilder.addRequestParams( req, {
				a: [ Symbol( "wut" ) ]
			} );
		} ).to.throw( "Unable to provide a default sql type for array item symbol Symbol(wut)" );

		req.addParameter.should.not.be.called();
	} );

	it( "should error when mapping types for unknown object in array", () => {
		const req = getRequest( "insert into lol values (@a)" );

		expect( () => {
			parameterBuilder.addRequestParams( req, {
				a: [ { hi: true, go: "boom" } ]
			} );
		} ).to.throw( "Unable to provide a default sql type for array item object {\"hi\":true,\"go\":\"boom\"}" );

		req.addParameter.should.not.be.called();
	} );

	it( "should error when mapping types for mixed type array", () => {
		const req = getRequest( "insert into lol values (@a)" );

		expect( () => {
			parameterBuilder.addRequestParams( req, {
				a: [ "lol", true ]
			} );
		} ).to.throw( "Unable to provide a default type for array with mixed types" );

		req.addParameter.should.not.be.called();
	} );
} );
