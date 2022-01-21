const { config } = testHelpers;

const skwell = require( "src" );
const { types } = skwell;

describe( "Types - Integration", () => {
	let sql;
	before( async () => {
		sql = await skwell.connect( config );
	} );

	after( () => {
		return sql.dispose();
	} );

	it( "should round trip types", () => {
		const datetime = new Date();
		datetime.setMilliseconds( 0 ); // compensating for sql datetime precision differences

		const datetime2 = new Date();

		const query = `
		SELECT
			@bit as [bit],
			@int as [int],
			@bigint as [bigint],
			@decimal32 as [decimal32],
			@datetime as [datetime],
			@datetime2 as [datetime2],
			@nvarchar3 as [nvarchar3],
			@nvarchar as [nvarchar],
			@nvarcharmax as [nvarcharmax]
		`;

		return sql.queryFirst( query, {
			bit: { val: true, type: sql.bit },
			int: { val: 1, type: sql.int },
			bigint: { val: "1", type: sql.bigint },
			decimal32: { val: 1.234, type: sql.decimal( 3, 2 ) },
			datetime: { val: datetime, type: sql.datetime },
			datetime2: { val: datetime2, type: sql.datetime2( 7 ) },
			nvarchar3: { val: "!".repeat( 3 ), type: sql.nvarchar( 3 ) },
			nvarchar: { val: "!".repeat( 4000 ), type: sql.nvarchar },
			nvarcharmax: { val: "!".repeat( 4001 ), type: sql.nvarchar( sql.max ) }
		} ).should.eventually.deep.equal( {
			bit: true,
			int: 1,
			bigint: "1",
			decimal32: 1.23,
			datetime,
			datetime2,
			nvarchar3: "!!!",
			nvarchar: "!".repeat( 4000 ),
			nvarcharmax: "!".repeat( 4001 )
		} );
	} );

	it( "should persist dates in UTC", () => {
		const local = new Date( "2020-06-23T13:46:37.003-05:00" );
		const utc = new Date( "2020-06-24T09:46:37.003Z" );

		const query = `
			SELECT
				local = convert( varchar, @local, 126 ),
				utc = convert( varchar, @utc, 126 )
		`;

		return sql.queryFirst( query, {
			local: { val: local, type: sql.datetime },
			utc: { val: utc, type: sql.datetime }
		} ).should.eventually.deep.equal( {
			local: "2020-06-23T18:46:37.003",
			utc: "2020-06-24T09:46:37.003"
		} );
	} );

	it( "should round trip table types", () => {
		const datetime = new Date();
		datetime.setMilliseconds( 0 ); // compensating for sql datetime precision differences

		const datetime2 = new Date();

		const query = `
		SELECT top 1 * from @jsonStuff;
		`;

		return sql.queryFirst( query, {
			jsonStuff: {
				type: {
					bit: sql.bit,
					int: sql.int,
					bigint: sql.bigint,
					decimal32: sql.decimal( 3, 2 ),
					datetime: sql.datetime,
					datetime2: sql.datetime2( 7 ),
					nvarchar3: sql.nvarchar( 3 ),
					nvarchar: sql.nvarchar,
					nvarcharmax: sql.nvarchar( sql.max ),
					index: sql.tinyint
				},
				val: [ {
					bit: true,
					int: 1,
					bigint: "1",
					decimal32: 1.234,
					datetime,
					datetime2,
					nvarchar3: "!".repeat( 3 ),
					nvarchar: "!".repeat( 4000 ),
					nvarcharmax: "!".repeat( 4001 ),
					index: 7
				} ]
			}
		} ).should.eventually.deep.equal( {
			bit: true,
			int: 1,
			bigint: "1",
			decimal32: 1.23,
			datetime,
			datetime2,
			nvarchar3: "!!!",
			nvarchar: "!".repeat( 4000 ),
			nvarcharmax: "!".repeat( 4001 ),
			index: 7
		} );
	} );

	it( "should round trip tvp", async () => {
		await sql.executeBatch( `
			IF TYPE_ID('IdTable') IS NULL BEGIN
				CREATE TYPE IdTable
				AS TABLE
					( value BIGINT );
			END` );
		await sql.executeBatch( `
			CREATE OR ALTER PROCEDURE usp_test(@ids IdTable READONLY) AS
			BEGIN
				SELECT value FROM @ids
			END` );

		const ids = await sql.query( sql.sproc( "usp_test" ), {
			ids: {
				type: sql.tvp( {
					value: sql.bigint
				} ),
				val: [ { value: "1" }, { value: "2" } ]
			}
		} );

		ids.should.deep.equal( [ { value: "1" }, { value: "2" } ] );
	} );


	Object.keys( types ).forEach( name => {
		it( `should have same ${ name } type for module and client`, () => {
			types[ name ].should.equal( sql[ name ] );
		} );
	} );
} );
