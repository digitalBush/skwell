/* eslint-disable camelcase */
const { config } = testHelpers;

const skwell = require( "src" );
describe( "Basic - Integration", () => {
	let sql;
	before( async () => {
		sql = await skwell.connect( config );
		await sql.execute( sql.file( "sql/basic-setup" ) );
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
				.should.eventually.be.rejectedWith( "Invalid object name 'lol'." )
				.and.have.property( "stack" ).with.string( "basic.spec.js" );
		} );

		it( "should work with sprocs", () => {
			return sql.execute( sql.sproc( "sp_server_info" ), {
				attribute_id: {
					type: sql.int,
					val: 1
				}
			} )
				.should.eventually.equal( 1 );
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
				.should.eventually.be.rejectedWith( "Invalid object name 'lol'." )
				.and.have.property( "stack" ).with.string( "basic.spec.js" );
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
				FROM Boom
				ORDER BY id DESC;

				SELECT sum(id)
				FROM QueryTests;`;

			return sql.querySets( query )
				.should.eventually.be.rejectedWith( "Invalid object name 'Boom'" )
				.and.have.property( "stack" ).with.string( "basic.spec.js" );
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

			return sql.query( query, {
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

			return sql.query( query, {
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
				.should.eventually.be.rejectedWith( "Invalid object name 'lol'." )
				.and.have.property( "stack" ).with.string( "basic.spec.js" );
		} );

		it( "should reject when query returns more than one set of data", () => {
			const query = `
				SELECT *
				FROM QueryTests;

				SELECT *
				FROM QueryTests;
			`;

			return sql.query( query )
				.should.eventually.be.rejectedWith( "Query returns more than one set of data. Use querySets method to return multiple sets of data." )
				.and.have.property( "stack" ).with.string( "basic.spec.js" );
		} );

		it( "should work with sprocs", () => {
			return sql.query( sql.sproc( "sp_server_info" ), {
				attribute_id: {
					type: sql.int,
					val: 1
				}
			} )
				.should.eventually.deep.equal( [ {
					attribute_id: 1,
					attribute_name: "DBMS_NAME",
					attribute_value: "Microsoft SQL Server"
				} ] );
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

		it( "should return null when result set is empty", () => {
			const query = `
				SELECT *
				FROM QueryTests WHERE id = -999`;

			return sql.queryFirst( query )
				.should.eventually.be.null();
		} );

		it( "should return null when no data is returned", () => {
			const query = `
				DECLARE @lol bigint =0;
			`;

			return sql.queryFirst( query )
				.should.eventually.be.null();
		} );

		it( "should reject on a sql error", () => {
			const query = `
				SELECT TOP 1 *
				FROM lol
				WHERE BadSql=1;`;

			return sql.queryFirst( query )
				.should.be.rejectedWith( "Invalid object name 'lol'." );
		} );

		it( "should reject when query returns more than one set of data", () => {
			const query = `
				SELECT *
				FROM QueryTests;

				SELECT *
				FROM QueryTests;
			`;

			return sql.queryFirst( query )
				.should.eventually.be.rejectedWith( "Query returns more than one set of data. Use querySets method to return multiple sets of data." )
				.and.have.property( "stack" ).with.string( "basic.spec.js" );
		} );
		it( "should work with sprocs", () => {
			return sql.queryFirst( sql.sproc( "sp_server_info" ), {
				attribute_id: {
					type: sql.int,
					val: 1
				}
			} )
				.should.eventually.deep.equal( {
					attribute_id: 1,
					attribute_name: "DBMS_NAME",
					attribute_value: "Microsoft SQL Server"
				} );
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

		it( "should return null when result set is empty", () => {
			const query = `
				SELECT test
				FROM QueryTests WHERE id = -999`;

			return sql.queryValue( query )
				.should.eventually.be.null();
		} );

		it( "should return null when no data is returned", () => {
			const query = `
				DECLARE @lol bigint =0;
			`;

			return sql.queryValue( query )
				.should.eventually.be.null();
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

			return sql.queryValue( query )
				.should.eventually.be.rejectedWith( "Invalid object name 'lol'." )
				.and.have.property( "stack" ).with.string( "basic.spec.js" );
		} );

		it( "should reject when query returns more than one set of data", () => {
			const query = `
				SELECT *
				FROM QueryTests;

				SELECT *
				FROM QueryTests;
			`;

			return sql.queryValue( query )
				.should.eventually.be.rejectedWith( "Query returns more than one set of data. Use querySets method to return multiple sets of data." )
				.and.have.property( "stack" ).with.string( "basic.spec.js" );
		} );

		it( "should work with sprocs", () => {
			return sql.queryValue( sql.sproc( "sp_server_info" ), {
				attribute_id: {
					type: sql.int,
					val: 1
				}
			} )
				.should.eventually.deep.equal( 1 );
		} );
	} );
} );
