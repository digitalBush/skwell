const { sinon } = testHelpers;

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
			const expectedType = types.int.type;
			const expectedTypeOptions = { length: undefined, precision: undefined, scale: undefined };

			const req = getRequest( scenario.sql );

			parameterBuilder( req, {
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

		parameterBuilder( req, {
			bars: {
				val: [ ],
				type: types.int
			}
		} );

		req.sqlTextOrProcedure.should.equal( "SELECT * FROM lol WHERE foo in (SELECT 1 WHERE 1=0)" );

		req.addParameter.should.not.be.called();
	} );
} );
