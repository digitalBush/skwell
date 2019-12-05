const { config } = testHelpers;

const skwell = require( "src" );
describe( "Transaction Hooks - Integration", () => {
	describe( "with begin and end transaction hooks in place", () => {
		let sql;

		function insert( tx, who ) {
			return tx.execute( "insert into HooksTest(who, context) values(@who, @fromContext)", {
				who: {
					type: sql.nvarchar( 20 ),
					val: who
				},
				fromContext: {
					type: sql.nvarchar( 20 ),
					val: tx.context.userName
				}
			} );
		}

		before( async () => {
			sql = await skwell.connect( {
				...config,
				async onBeginTransaction( tx ) {
					await insert( tx, "before" );
				},
				async onEndTransaction( tx ) {
					await insert( tx, "after" );
				}
			} );

			return sql.execute( sql.fromFile( "sql/hooks-setup.sql" ) );
		} );

		after( () => {
			return sql.dispose();
		} );

		it( "should execute in proper order", async () => {
			await sql.transaction( async tx => {
				await insert( tx, "middle" );
			}, { context: { userName: "Josh" } } );

			const results = await sql.query( "select who,context from HooksTest order by [order]" );
			results.should.deep.equal( [
				{ who: "before", context: "Josh" },
				{ who: "middle", context: "Josh" },
				{ who: "after", context: "Josh" }
			] );
		} );
	} );
} );
