const { config } = testHelpers;

const skwell = require( "src" );
describe( "AbortTransactionOnError - Integration", () => {
	let sql;

	const setupSql = async thisConfig => {
		sql = await skwell.connect( thisConfig );
		return sql.execute( sql.fromFile( "sql/abortTransactionOnError-setup.sql" ) );
	};

	beforeEach( async () => {
		await sql.execute( "DELETE FROM ChildTests" );
		await sql.execute( "DELETE FROM ParentTests" );
	} );

	describe( "when set to false", () => {
		before( async () => {
			await setupSql( { ...config, abortTransactionOnError: false } );
		} );

		after( () => {
			return sql.dispose();
		} );

		it( "when using an explicit transaction in the query the entire query is not rolled back when an error is raised", async () => {
			const expectedError = "The INSERT statement conflicted with the FOREIGN KEY constraint";

			await sql.execute( `INSERT INTO ParentTests VALUES (1);
					INSERT INTO ParentTests VALUES (3);` );

			await sql.execute( `BEGIN TRANSACTION;
					INSERT INTO ChildTests VALUES (1);
					INSERT INTO ChildTests VALUES (2); -- Foreign key error.
					INSERT INTO ChildTests VALUES (3);
					COMMIT TRANSACTION` ).should.eventually.rejectedWith( expectedError );

			const childVals = await sql.query( "select * from ChildTests" );
			childVals.length.should.equal( 2 );
		} );

		it( "query does not stop when first error is raised", async () => {
			const expectedError = "The INSERT statement conflicted with the FOREIGN KEY constraint";

			await sql.execute( `INSERT INTO ParentTests VALUES (1);
					INSERT INTO ParentTests VALUES (3);` );

			await sql.execute( `INSERT INTO ChildTests VALUES (1);
					INSERT INTO ChildTests VALUES (2); -- Foreign key error.
					INSERT INTO ChildTests VALUES (3);` ).should.eventually.rejectedWith( expectedError );

			const childVals = await sql.query( "select * from ChildTests" );
			childVals.length.should.equal( 2 );
		} );
	} );

	describe( "when set to true", () => {
		before( async () => {
			await setupSql( { ...config, abortTransactionOnError: true } );
		} );

		after( () => {
			return sql.dispose();
		} );

		it( "when using an explicit transaction in the query the entire query is rolled back when an error is raised", async () => {
			const expectedError = "The INSERT statement conflicted with the FOREIGN KEY constraint";

			await sql.execute( `INSERT INTO ParentTests VALUES (1);
					INSERT INTO ParentTests VALUES (3);` );

			await sql.execute( `BEGIN TRANSACTION;
					INSERT INTO ChildTests VALUES (1);
					INSERT INTO ChildTests VALUES (2); -- Foreign key error.
					INSERT INTO ChildTests VALUES (3);
					COMMIT TRANSACTION;` ).should.eventually.rejectedWith( expectedError );

			const childVals = await sql.query( "select * from ChildTests" );
			childVals.length.should.equal( 0 );
		} );

		it( "query does stop when first error is raised", async () => {
			const expectedError = "The INSERT statement conflicted with the FOREIGN KEY constraint";

			await sql.execute( `INSERT INTO ParentTests VALUES (1);
					INSERT INTO ParentTests VALUES (3);` );

			await sql.execute( `INSERT INTO ChildTests VALUES (1);
					INSERT INTO ChildTests VALUES (2); -- Foreign key error.
					INSERT INTO ChildTests VALUES (3);` ).should.eventually.rejectedWith( expectedError );

			const childVals = await sql.query( "select * from ChildTests" );
			childVals.length.should.equal( 1 );
		} );
	} );

	describe( "when not set, should default to true", () => {
		before( async () => {
			await setupSql( config );
		} );

		after( () => {
			return sql.dispose();
		} );

		it( "when using an explicit transaction in the query the entire query is rolled back when an error is raised", async () => {
			const expectedError = "The INSERT statement conflicted with the FOREIGN KEY constraint";

			await sql.execute( `INSERT INTO ParentTests VALUES (1);
					INSERT INTO ParentTests VALUES (3);` );

			await sql.execute( `BEGIN TRANSACTION;
					INSERT INTO ChildTests VALUES (1);
					INSERT INTO ChildTests VALUES (2); -- Foreign key error.
					INSERT INTO ChildTests VALUES (3);
					COMMIT TRANSACTION;` ).should.eventually.rejectedWith( expectedError );

			const childVals = await sql.query( "select * from ChildTests" );
			childVals.length.should.equal( 0 );
		} );

		it( "query does stop when first error is raised", async () => {
			const expectedError = "The INSERT statement conflicted with the FOREIGN KEY constraint";

			await sql.execute( `INSERT INTO ParentTests VALUES (1);
					INSERT INTO ParentTests VALUES (3);` );

			await sql.execute( `INSERT INTO ChildTests VALUES (1);
					INSERT INTO ChildTests VALUES (2); -- Foreign key error.
					INSERT INTO ChildTests VALUES (3);` ).should.eventually.rejectedWith( expectedError );

			const childVals = await sql.query( "select * from ChildTests" );
			childVals.length.should.equal( 1 );
		} );
	} );
} );
