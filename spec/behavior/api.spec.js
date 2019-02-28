const { sinon, proxyquire } = testHelpers;

describe( "api", () => {
	describe( "when bulk loading", () => {
		let api, conn, bulk;

		beforeEach( async () => {
			const Api = proxyquire( "src/api", {} );
			api = new Api();
			bulk = {};
			conn = {
				execSql: sinon.spy( request => {
					request.callback();
				} ),
				newBulkLoad: sinon.stub().returns( bulk ),
				execBulkLoad: sinon.stub().callsFake( () => {
					bulk.callback( null, 0 );
				} )
			};
			api.withConnection = sinon.spy( async function( action ) {
				const result = await action( conn );
				return result;
			} );
		} );

		describe( "when creating a new bulk load without tedious options", () => {
			beforeEach( async () => {
				await api.bulkLoad( "the table", { schema: {}, rows: [] } );
			} );

			it( "should pass the default tedious options to newBulkLoad", () => {
				conn.newBulkLoad.should.be.calledOnce()
					.and.calledWithExactly( "the table", { checkConstraints: false, fireTriggers: false, keepNulls: false, tableLock: false }, sinon.match.func );
			} );
		} );

		describe( "when creating a new bulk load with tedious options", () => {
			beforeEach( async () => {
				await api.bulkLoad( "the table", { schema: {}, rows: [], checkConstraints: true, fireTriggers: true, keepNulls: true, tableLock: true } );
			} );

			it( "should pass the tedious options to newBulkLoad", () => {
				conn.newBulkLoad.should.be.calledOnce()
					.and.calledWithExactly( "the table", { checkConstraints: true, fireTriggers: true, keepNulls: true, tableLock: true }, sinon.match.func );
			} );
		} );

		describe( "when sql is a function", () => {
			let sql;
			beforeEach( () => {
				sql = sinon.stub().resolves( "SELECT 1" );
			} );
			[
				"execute",
				"querySets",
				"query",
				"queryFirst",
				"queryValue"
			].forEach( method => {
				it( `${ method }: should invoke function with object built from parameter values`, async () => {
					await api[ method ]( sql, {
						lol: {
							type: "bigint",
							val: "funny"
						}
					} );
					sql.should.be.calledOnce()
						.and.calledWithExactly( { lol: "funny" } );

					conn.execSql.should.be.calledOnce()
						.and.calledWithMatch( {
							sqlTextOrProcedure: "SELECT 1"
						} );
				} );
			} );

			it( "queryStream: should invoke function with object built from parameter values", done => {
				api.queryStream( sql, {
					lol: {
						type: "bigint",
						val: "funny"
					}
				} );
				setTimeout( () => {
					sql.should.be.calledOnce()
						.and.calledWithExactly( { lol: "funny" } );

					conn.execSql.should.be.calledOnce()
						.and.calledWithMatch( {
							sqlTextOrProcedure: "SELECT 1"
						} );
					done();
				}, 1 );
			} );
		} );
	} );
} );
