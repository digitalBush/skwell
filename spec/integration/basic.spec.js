const { config } = testHelpers;

const skwell = require( "src" );
describe( "Basic - Integration", () => {
	let sql;
	before( async () => {
		sql = await skwell.connect( config );
		await sql.execute( sql.fromFile( "sql/basic-setup" ) );
	} );

	after( () => {
		return sql.dispose();
	} );

	describe( "execute", () => {
		it( "should work without params", () => {
			const query = `
				INSERT INTO MutationTests
				VALUES (1,'A'), (2, 'B');`;

			return sql.execute( query )
				.should.eventually.equal( 2 );
		} );

		it( "should work with params", () => {
			const query = `
				INSERT INTO MutationTests
				VALUES (@id,@name);`;

			return sql.execute( query, {
				id: { val: 3, type: sql.int },
				name: { val: "C", type: sql.nvarchar( 10 ) }
			} )
				.should.eventually.equal( 1 );
		} );

		it( "should reject on a sql error", () => {
			const query = `
				UPDATE lol
				SET nope=0
				WHERE BadSql=1;`;

			return sql.execute( query )
				.should.be.rejectedWith( "Invalid object name 'lol'." );
		} );
	} );

	describe( "executeBatch", () => {
		it( "should work with valid sql", () => {
			const query = `
				CREATE TABLE LOL( Funny nvarchar(20) );
				INSERT INTO LOL VALUES( 'JOKE' );
				DROP TABLE LOL;
			`;

			return sql.executeBatch( query )
				.should.eventually.equal( 1 );
		} );

		it( "should reject on a sql error", () => {
			const query = `
				UPDATE lol
				SET nope=0
				WHERE BadSql=1;`;

			return sql.executeBatch( query )
				.should.be.rejectedWith( "Invalid object name 'lol'." );
		} );
	} );

	describe( "querySets", () => {
		it( "should work without params", () => {
			const query = `
				SELECT *
				FROM QueryTests
				ORDER BY id DESC;

				SELECT sum(id)
				FROM QueryTests;`;

			return sql.querySets( query )
				.should.eventually.deep.equal( [
					[
						{ id: 3, test: "C" },
						{ id: 2, test: "B" },
						{ id: 1, test: "A" }
					],
					[ { 0: 6 } ]
				] );
		} );

		it( "should work with params", () => {
			const query = `
				SELECT *
				FROM QueryTests
				WHERE id > @id
				ORDER BY id DESC;

				SELECT sum(id)
				FROM QueryTests
				WHERE id > @id;`;

			return sql.querySets( query, {
				id: { val: 1, type: sql.int }
			} )
				.should.eventually.deep.equal( [
					[
						{ id: 3, test: "C" },
						{ id: 2, test: "B" }
					],
					[ { 0: 5 } ]
				] );
		} );

		it( "should reject on a sql error", () => {
			const query = `
				SELECT *
				FROM QueryTests
				ORDER BY id DESC;

				SELECT sum(id)
				FROM QueryTests;`;

			return sql.query( query )
				.should.be.rejectedWith( "Query returns more than one set of data. Use querySets method to return multiple sets of data." );
		} );
	} );

	describe( "query", () => {
		it( "should work without params", () => {
			const query = `
				SELECT *
				FROM QueryTests
				ORDER BY id DESC`;

			return sql.query( query )
				.should.eventually.deep.equal( [
					{ id: 3, test: "C" },
					{ id: 2, test: "B" },
					{ id: 1, test: "A" }
				] );
		} );

		it( "should work with params", () => {
			const query = `
				SELECT *
				FROM QueryTests
				WHERE id > @id
				ORDER BY id DESC`;

			return sql.query( query, {
				id: { val: 1, type: sql.int }
			} )
				.should.eventually.deep.equal( [
					{ id: 3, test: "C" },
					{ id: 2, test: "B" }
				] );
		} );

		it( "should work with an object array param", () => {
			const query = `
				SELECT *
				FROM @users`;

			return sql
				.query( query, {
					users: {
						val: [ { id: 1, name: "Josh" }, { id: 2, name: "Calvin" } ],
						type: {
							id: sql.int,
							name: sql.nvarchar( 20 )
						}
					}
				} )
				.should.eventually.deep.equal( [
					{ id: 1, name: "Josh" },
					{ id: 2, name: "Calvin" }
				] );
		} );

		it( "should work with a value array param", () => {
			const query = `
				SELECT * from (select 1 id union select 2 union select 3 ) t
				where t.id in @userIds
			`;

			return sql
				.query( query, {
					userIds: {
						val: [ 1, 2 ],
						type: sql.int
					}
				} )
				.should.eventually.deep.equal( [ { id: 1 }, { id: 2 } ] );
		} );

		it( "should work with a empty value array param", () => {
			const query = `
				SELECT * from (select 1 id union select 2 id ) t
				where t.id in @userIds
			`;

			return sql
				.query( query, {
					userIds: {
						val: [ ],
						type: sql.int
					}
				} )
				.should.eventually.deep.equal( [ ] );
		} );

		it( "should return an empty array when sql returns nothing", () => {
			const query = "";

			return sql.query( query )
				.should.eventually.deep.equal( [] );
		} );

		it( "should reject on a sql error", () => {
			const query = `
				SELECT *
				FROM lol
				WHERE BadSql=1;`;

			return sql.query( query )
				.should.be.rejectedWith( "Invalid object name 'lol'." );
		} );

		it( "should reject when query returns more than one set of data", () => {
			const query = `
				SELECT *
				FROM lol
				WHERE BadSql=1;`;

			return sql.query( query )
				.should.be.rejectedWith( "Invalid object name 'lol'." );
		} );
	} );

	describe( "queryStream", () => {
		it( "should work without params", done => {
			const query = `
				SELECT *
				FROM QueryTests
				ORDER BY id DESC`;

			const stream = sql.queryStream( query );

			const rows = [];
			stream
				.on( "data", data => {
					rows.push( data );
				} )
				.on( "end", () => {
					rows.should.deep.equal( [
						{
							metadata: {
								columnNames: [ "id", "test" ]
							}
						},
						{ row: { id: 3, test: "C" } },
						{ row: { id: 2, test: "B" } },
						{ row: { id: 1, test: "A" } }
					] );
					done();
				} );
		} );

		it( "should work with params", done => {
			const query = `
				SELECT *
				FROM QueryTests
				WHERE id > @id
				ORDER BY id DESC`;

			const stream = sql.queryStream( query, {
				id: { val: 1, type: sql.int }
			} );

			const rows = [];
			stream
				.on( "data", data => {
					rows.push( data );
				} )
				.on( "end", () => {
					rows.should.deep.equal( [
						{
							metadata: {
								columnNames: [ "id", "test" ]
							}
						},
						{ row: { id: 3, test: "C" } },
						{ row: { id: 2, test: "B" } }
					] );
					done();
				} );
		} );

		it( "should produce a stream error when sql error", done => {
			const query = `
				SELECT *
				FROM lol
				WHERE BadSql=1;`;

			const stream = sql.queryStream( query );

			stream.on( "error", ( { message } ) => {
				message.should.equal( "Invalid object name 'lol'." );
				done();
			} );
		} );
	} );

	describe( "queryFirst", () => {
		it( "should work without params", () => {
			const query = `
				SELECT *
				FROM QueryTests
				ORDER BY id DESC`;

			return sql.queryFirst( query )
				.should.eventually.deep.equal( {
					id: 3,
					test: "C"
				} );
		} );

		it( "should work with params", () => {
			const query = `
				SELECT *
				FROM QueryTests
				WHERE id = @id
				ORDER BY id DESC`;

			return sql.queryFirst( query, {
				id: { val: 1, type: sql.int }
			} )
				.should.eventually.deep.equal( {
					id: 1,
					test: "A"
				} );
		} );

		it( "should reject on a sql error", () => {
			const query = `
				SELECT TOP 1 *
				FROM lol
				WHERE BadSql=1;`;

			return sql.query( query )
				.should.be.rejectedWith( "Invalid object name 'lol'." );
		} );
	} );

	describe( "queryValue", () => {
		it( "should work without params", () => {
			const query = `
				SELECT test
				FROM QueryTests
				ORDER BY id DESC`;

			return sql.queryValue( query )
				.should.eventually.equal( "C" );
		} );

		it( "should work with params", () => {
			const query = `
				SELECT test
				FROM QueryTests
				WHERE id = @id
				ORDER BY id DESC`;

			return sql.queryValue( query, {
				id: { val: 1, type: sql.int }
			} )
				.should.eventually.equal( "A" );
		} );

		it( "should return null when no data", () => {
			const query = `
				SELECT test
				FROM QueryTests
				WHERE 1=0
				ORDER BY id DESC`;

			return sql.queryValue( query )
				.should.eventually.be.null();
		} );

		it( "should reject on a sql error", () => {
			const query = `
				SELECT sum(total)
				FROM lol
				WHERE BadSql=1;`;

			return sql.query( query )
				.should.be.rejectedWith( "Invalid object name 'lol'." );
		} );
	} );
} );
