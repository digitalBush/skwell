const { config } = testHelpers;

const skwell = require( "src" );
describe( "Extensibility - Integration", () => {
	describe( "can intercept transaction", () => {
		let origRun, sql;

		before( async () => {
			origRun = skwell.Transaction.run;

			// patch the transaction runner
			skwell.Transaction.run = ( ...args ) => {
				const action = args.pop();
				args.push( async tx => {
					await tx.execute( "insert into ExtensibilityTest(who) values('before')" );
					const result = await action( tx );
					await tx.execute( "insert into ExtensibilityTest(who) values('after')" );
					return result;
				} );
				return origRun( ...args );
			};

			sql = await skwell.connect( config );
			return sql.execute( sql.fromFile( "sql/extensibility-setup.sql" ) );
		} );

		after( () => {
			skwell.Transaction.run = origRun;
			return sql.dispose();
		} );

		it( "should wrap transaction", async () => {
			await sql.transaction( async tx => {
				await tx.execute( "insert into ExtensibilityTest(who) values('middle')" );
			} );

			const results = await sql.query( "select who from ExtensibilityTest order by [order]" );
			results.should.deep.equal( [
				{ who: "before" },
				{ who: "middle" },
				{ who: "after" }
			] );
		} );
	} );
} );
