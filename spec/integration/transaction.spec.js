const { config } = testHelpers;

const skwell = require( "src" );
describe( "Transaction - Integration", () => {
	let sql;
	before( async () => {
		sql = await skwell.connect( config );
		return sql.execute( sql.fromFile( "sql/transaction-setup.sql" ) );
	} );

	beforeEach( async () => {
		await sql.execute( "DELETE FROM MutationTests" );
	} );

	after( () => {
		return sql.dispose();
	} );

	describe( "isolation levels", () => {
		const isolationLevelQuery = `
			SELECT CASE transaction_isolation_level
				WHEN 0 THEN 'Unspecified'
				WHEN 1 THEN 'ReadUncommitted'
				WHEN 2 THEN 'ReadCommitted'
				WHEN 3 THEN 'Repeatable'
				WHEN 4 THEN 'Serializable'
				WHEN 5 THEN 'Snapshot' END AS level
			FROM sys.dm_exec_sessions
			where session_id = @@SPID`;

		it( "should default to read committed isolation level", async () => {
			await sql.transaction( async () => {
				return sql.queryValue( isolationLevelQuery );
			} ).should.eventually.equal( "ReadCommitted" );
		} );

		it( "should set isolation level", async () => {
			await sql.transaction( async () => {
				return sql.queryValue( isolationLevelQuery );
			}, sql.read_uncommitted ).should.eventually.equal( "ReadUncommitted" );
		} );
	} );

	describe( "rollback", () => {
		it( "should roll back transaction when sql fails", async () => {
			const expectedError = "Automatic Rollback. Failed Because: Invalid object name 'fake_table'.";

			await sql.transaction( async () => {
				await sql.execute( "insert into MutationTests(id) values (1)" );
				await sql.query( "select lol from fake_table" );
			} ).should.eventually.be.rejectedWith( expectedError );

			const vals = await sql.query( "select * from MutationTests" );
			vals.length.should.equal( 0 );
		} );

		it( "should roll back transaction when an error is thrown", async () => {
			await sql.transaction( async () => {
				await sql.execute( "insert into MutationTests(id) values (1)" );
				throw new Error( "NOPE" );
			} ).should.eventually.be.rejectedWith( "NOPE" );

			const vals = await sql.query( "select * from MutationTests" );
			vals.length.should.equal( 0 );
		} );
	} );

	it( "should commit transaction when promise resolves", async () => {
		await sql.transaction( async () => {
			await sql.execute( "insert into MutationTests(id) values (1)" );
		} );

		const vals = await sql.query( "select * from MutationTests" );
		vals.should.deep.equal( [ { id: 1 } ] );
	} );
} );
