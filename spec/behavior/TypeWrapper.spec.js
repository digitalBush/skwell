const { sinon } = testHelpers;

const TypeWrapper = require( "src/TypeWrapper" );
const testType = new TypeWrapper( "foo" );

describe( "TypeWrapper", () => {
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
			const expectedType = testType.type;
			const expectedTypeOptions = { length: undefined, precision: undefined, scale: undefined };

			const req = getRequest( scenario.sql );
			testType.addToRequest( req, "bars", [ 1, 2, 3 ] );

			req.sqlTextOrProcedure.should.equal( "SELECT * FROM lol WHERE foo in (@bars0,@bars1,@bars2)" );

			req.addParameter.should.be.calledThrice()
				.and.calledWithExactly( "bars0", expectedType, 1, expectedTypeOptions )
				.and.calledWithExactly( "bars1", expectedType, 2, expectedTypeOptions )
				.and.calledWithExactly( "bars2", expectedType, 3, expectedTypeOptions );
		} );
	} );

	it( "should provide empty set sql when expanding params on an empty list", () => {
		const req = getRequest( "SELECT * FROM lol WHERE foo in @bars" );

		testType.addToRequest( req, "bars", [ ] );

		req.sqlTextOrProcedure.should.equal( "SELECT * FROM lol WHERE foo in (SELECT 1 WHERE 1=0)" );
		req.addParameter.should.not.be.called();
	} );
} );
