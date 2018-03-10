const EventEmitter = require( "events" );
const pEvent = require( "p-event" );

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

	it( "should not enlist ambient transaction outside of transaction scope", async () => {
		const emitter = new EventEmitter();

		const getId = function() {
			return sql.queryValue( "select CURRENT_TRANSACTION_ID()" );
		};

		const tx1 = sql.transaction( async () => {
			const txId = await getId();
			await pEvent( emitter, "finished" );
			const txId2 = await getId();

			txId.should.equal( txId2 );

			return txId;
		} );

		const tx2 = sql.transaction( async () => {
			const txId = await getId();
			emitter.emit( "finished" );
			const txId2 = await getId();

			txId.should.equal( txId2 );

			return txId;
		} );

		const [ txId1, txId2, txId3 ] = await Promise.all( [ tx1, tx2, getId() ] );
		txId1.should.not.equal( txId2 );
		txId1.should.not.equal( txId3 );
		txId2.should.not.equal( txId3 );
	} );

	it( "should not enlist ambient transaction inside of transaction scope across clients", async () => {
		const sql2 = await skwell.connect( config );

		await sql.transaction( async () => {
			const txId = await sql.queryValue( "select CURRENT_TRANSACTION_ID()" );
			const txId2 = await sql2.queryValue( "select CURRENT_TRANSACTION_ID()" );
			txId.should.not.equal( txId2 );
		} );
		sql2.dispose();
	} );

	it( "should commit transaction when promise resolves", async () => {
		await sql.transaction( async () => {
			await sql.execute( "insert into MutationTests(id) values (1)" );
		} );

		const vals = await sql.query( "select * from MutationTests" );
		vals.should.deep.equal( [ { id: 1 } ] );
	} );
} );
