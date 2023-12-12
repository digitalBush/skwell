const { config } = testHelpers;

const skwell = require( "src" );
describe( "No Pooling - Integration", () => {
	let sql;
	before( async () => {
		const emptyPoolConfig = Object.assign( {}, config, { pool: false } );
		sql = await skwell.connect( emptyPoolConfig );
	} );

	after( () => {
		return sql.dispose();
	} );

	it( "should not reuse the same connection", async () => {
		const query = "select connection_id from sys.dm_exec_connections where session_id = @@spid";

		const cid1 = await sql.queryValue( query );
		const cid2 = await sql.queryValue( query );
		cid1.should.not.equal( cid2 );
	} );
} );
