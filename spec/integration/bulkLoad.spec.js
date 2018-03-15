const { config } = testHelpers;

const skwell = require( "src" );
describe( "Bulk Load - Integration", () => {
	let sql;
	before( async () => {
		sql = await skwell.connect( config );
		return sql.execute( sql.fromFile( "sql/bulkLoad-setup.sql" ) );
	} );

	afterEach( async () => {
		await sql.execute( `
			DELETE FROM BulkLoadTest;
			DROP TABLE IF EXISTS BulkLoadTestNew;
		` );
	} );

	after( () => {
		return sql.dispose();
	} );
	describe( "connection pool", () => {
		[ "[#temp]", "dbo.[#temp]", "[dbo].[#temp]", "dbo.#temp", "#temp" ].forEach( table => {
			it( `should not bulk load a temp table - ${ table }`, () => {
				return sql.bulkLoad( table, {
					create: true,
					schema: {
						id: sql.int
					},
					rows: [ { id: 1 } ]
				} ).should.eventually.be.rejectedWith( Error, `Unable to load temp table '${ table }' using connection pool. Use a transaction instead.` );
			} );
		} );

		it( "should bulk load a table", async () => {
			await sql.bulkLoad( "BulkLoadTest", {
				schema: {
					id: sql.int.nullable()
				},
				rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
			} );
			const rows = await sql.query( "select * from BulkLoadTest" );
			rows.should.deep.equal( [ { id: 1 }, { id: 2 }, { id: 3 } ] );
		} );

		it( "should create and bulk load a table", async () => {
			await sql.bulkLoad( "BulkLoadTestNew", {
				create: true,
				schema: {
					id: sql.int,
					other: sql.int.nullable()
				},
				rows: [ { id: 1, other: 1 }, { id: 2 }, { id: 3 } ]
			} );
			const rows = await sql.query( "select * from BulkLoadTestNew" );
			rows.should.deep.equal( [ { id: 1, other: 1 }, { id: 2, other: null }, { id: 3, other: null } ] );
		} );

		it( "should error when bulk loading a missing table without create", async () => {
			return sql.bulkLoad( "BulkLoadTestWontBeThere", {
				schema: {
					id: sql.int.nullable()
				},
				rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
			} ).should.eventually.be.rejectedWith( "Invalid object name 'BulkLoadTestWontBeThere'" );
		} );
	} );

	describe( "transaction", () => {
		[ "[#temp]", "dbo.[#temp]", "[dbo].[#temp]", "dbo.#temp", "#temp" ].forEach( table => {
			it( `should bulk load a temp table - ${ table }`, () => {
				return sql.transaction( async () => {
					await sql.bulkLoad( table, {
						create: true,
						schema: {
							id: sql.int.nullable( false )
						},
						rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
					} );
					const rows = await sql.query( `select * from ${ table }` );
					rows.should.deep.equal( [ { id: 1 }, { id: 2 }, { id: 3 } ] );
				} );
			} );
		} );

		it( "should bulk load a table", () => {
			return sql.transaction( async () => {
				await sql.bulkLoad( "BulkLoadTest", {
					schema: {
						id: sql.int.nullable
					},
					rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
				} );
				const rows = await sql.query( "select * from BulkLoadTest" );
				rows.should.deep.equal( [ { id: 1 }, { id: 2 }, { id: 3 } ] );
			} );
		} );

		it( "should create and bulk load a table", () => {
			return sql.transaction( async () => {
				await sql.bulkLoad( "BulkLoadTestNew", {
					create: true,
					schema: {
						id: sql.nvarchar.nullable
					},
					rows: [ { id: "1" }, { id: "2" }, { id: "3" } ]
				} );
				const rows = await sql.query( "select * from BulkLoadTestNew" );
				rows.should.deep.equal( [ { id: "1" }, { id: "2" }, { id: "3" } ] );
			} );
		} );
	} );
} );
