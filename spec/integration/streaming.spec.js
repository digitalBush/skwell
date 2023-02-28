/* eslint-disable camelcase */
const { config } = testHelpers;

const { Writable } = require( "node:stream" );
const { pipeline } = require( "node:stream/promises" );

const skwell = require( "src" );

describe( "Streaming - Integration", () => {
	let sql;
	before( async () => {
		sql = await skwell.connect( config );
		await sql.execute( sql.fromFile( "sql/basic-setup" ) );
	} );

	after( () => {
		return sql.dispose();
	} );


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

	it( "should work with sprocs", done => {
		const stream = sql.queryStream( sql.sproc( "sp_server_info" ), {
			attribute_id: {
				type: sql.int,
				val: 1
			}
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
							columnNames: [ "attribute_id", "attribute_name", "attribute_value" ]
						}
					},
					{ row: {
						attribute_id: 1,
						attribute_name: "DBMS_NAME",
						attribute_value: "Microsoft SQL Server"
					} }
				] );
				done();
			} );
	} );

	it( "should work when backpressure is applied", done => {
		const rows = [];
		const theSlowWriter = new Writable( { // drives a little slower
			objectMode: true,
			highWaterMark: 1,
			write( obj, _, cb ) {
				setTimeout( () => {
					rows.push( obj );
					cb( null );
				}, 1 );
			}
		} );

		const query = `
			WITH x AS (SELECT n FROM (VALUES (0),(1),(2),(3),(4),(5),(6),(7),(8),(9)) v(n))
			SELECT ones.n + 10*tens.n
			FROM x ones, x tens
			ORDER BY 1
		`;

		sql.queryStream( query ).pipe( theSlowWriter );
		theSlowWriter.on( "finish", () => {
			rows.length.should.equal( 101 );
			done();
		} );
	} );

	it( "should produce a stream error when there is a sql error", done => {
		const query = `
				SELECT *
				FROM lol
				WHERE BadSql=1;`;

		const stream = sql.queryStream( query );

		stream.on( "error", err => {
			err.message.should.equal( "Invalid object name 'lol'." );
			err.stack.should.have.string( "streaming.spec.js" );
			done();
		} );
	} );

	it( "should cancel request if receiving stream closes", async () => {
		const brokenWriter = new Writable( {
			objectMode: true,
			write( _1, _2, cb ) {
				cb( new Error( "oops" ) );
			}
		} );

		const query = `
			SELECT 1 as n
			WAITFOR DELAY '0:00.100'
			SELECT 2 as n
		`;

		const readable = sql.queryStream( query );

		await pipeline( [ readable, brokenWriter ] ).should.eventually.be.rejectedWith( "oops" );
	} );

	it( "should rollback transaction if receiving stream closes", async () => {
		const brokenWriter = new Writable( {
			objectMode: true,
			write( _1, _2, cb ) {
				cb( new Error( "oops" ) );
			}
		} );

		await sql.transaction( async tx => {
			await tx.execute( "INSERT INTO MutationTests VALUES(1, 'should go away')" );
			const readable = tx.queryStream( "SELECT 1 WHERE 1=0" );
			await pipeline( [ readable, brokenWriter ] );
		} )
			.should.eventually.be.rejectedWith( "Automatic Rollback. Failed Because: oops" );

		const results = await sql.query( "SELECT * from MutationTests" );
		results.should.deep.equal( [] );
	} );
} );
