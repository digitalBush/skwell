const { config } = testHelpers;

const skwell = require( "src/" );
describe( "Connection Reset - Integration", () => {
	let sql;
	before( () => {
		const singleConnectionPoolConfig = Object.assign( {}, config, { pool: { min: 1, max: 1 } } );
		sql = skwell.connect( singleConnectionPoolConfig );
	} );

	after( () => {
		return sql.dispose();
	} );

	it( "should reuse the same connection between each call", async () => {
		const spid = await sql.queryValue( "select @@spid" );
		const spid2 = await sql.queryValue( "select @@spid" );
		spid.should.equal( spid2 );
	} );

	it( "should reset connection between calls", async () => {
		const tempTable = `
			CREATE TABLE ##should_be_gone (id int);
			INSERT INTO ##should_be_gone values(1);
		`;

		await sql.execute( tempTable );
		return sql.query( "SELECT * FROM ##should_be_gone" )
			.should.be.rejectedWith( "Invalid object name '##should_be_gone'" );
	} );
} );
