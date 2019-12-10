const { config } = testHelpers;

const skwell = require( "src" );
describe( "Types - Integration", () => {
	let sql;
	before( async () => {
		sql = await skwell.connect( config );
	} );

	after( () => {
		return sql.dispose();
	} );

	it( "it should round trip types", () => {
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

	it( "it should round trip table types", () => {
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
					nvarcharmax: sql.nvarchar( sql.max )
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
					nvarcharmax: "!".repeat( 4001 )
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
			nvarcharmax: "!".repeat( 4001 )
		} );
	} );
} );
