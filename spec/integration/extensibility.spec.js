const { config } = testHelpers;

const skwell = require( "src" );
describe( "Extensibility - Integration", () => {
	describe( "can intercept transaction", () => {
		let origTransaction, sql;

		before( async () => {
			origTransaction = skwell.Client.prototype.transaction;

			// patch the transaction runner
			skwell.Client.prototype.transaction = function( action, isolationLevel ) {
				const wrappedAction = async () => {
					await sql.execute( "insert into ExtensibilityTest(who) values('before')" );
					const result = await action();
					await sql.execute( "insert into ExtensibilityTest(who) values('after')" );
					return result;
				};
				return origTransaction.call( this, wrappedAction, isolationLevel );
			};

			sql = await skwell.connect( config );
			return sql.execute( sql.fromFile( "sql/extensibility-setup.sql" ) );
		} );

		after( () => {
			skwell.Client.prototype.transaction = origTransaction;
			return sql.dispose();
		} );

		it( "should wrap transaction", async () => {
			await sql.transaction( async () => {
				await sql.execute( "insert into ExtensibilityTest(who) values('middle')" );
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
