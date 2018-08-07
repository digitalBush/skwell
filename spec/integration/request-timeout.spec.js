const { config } = testHelpers;

const skwell = require( "src" );
describe( "Request Timeout - Integration", () => {
	let sql;

	before( async () => {
		const lowRequestTimeout = Object.assign( {}, config, { requestTimeout: 100 } );
		sql = await skwell.connect( lowRequestTimeout );
	} );

	it( "should succeed for fast requests", async () => {
		const result = await sql.queryValue( "select 1" );
		result.should.equal( 1 );
	} );

	it( "should fail on slow queries", async () => {
		await sql.execute( "waitfor delay '2:00'" ).should.be.rejectedWith( "Timeout: Request failed to complete in 100ms" );
	} );
} );
