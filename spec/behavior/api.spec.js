const { sinon, proxyquire } = testHelpers;

describe( "api", () => {
	describe( "when bulk loading", () => {
		let api, conn, bulk;

		beforeEach( async () => {
			const Api = proxyquire( "src/api", {} );
			api = new Api();
			api.withConnection = sinon.stub();
			bulk = {};
			conn = {
				newBulkLoad: sinon.stub().returns( bulk ),
				execBulkLoad: sinon.stub().callsFake( () => {
					bulk.callback( null, 0 );
				} )
			};
		} );

		describe( "when creating a new bulk load without tedious options", () => {
			beforeEach( async () => {
				api.bulkLoad( "the table", { schema: {}, rows: [] } );
				await api.withConnection.getCall( 0 ).args[ 0 ]( conn );
			} );

			it( "should pass the default tedious options to newBulkLoad", () => {
				conn.newBulkLoad.should.be.calledOnce()
					.and.calledWithExactly( "the table", { checkConstraints: false, fireTriggers: false, keepNulls: false, tableLock: false }, sinon.match.func );
			} );
		} );

		describe( "when creating a new bulk load with tedious options", () => {
			beforeEach( async () => {
				api.bulkLoad( "the table", { schema: {}, rows: [], checkConstraints: true, fireTriggers: true, keepNulls: true, tableLock: true } );
				await api.withConnection.getCall( 0 ).args[ 0 ]( conn );
			} );

			it( "should pass the tedious options to newBulkLoad", () => {
				conn.newBulkLoad.should.be.calledOnce()
					.and.calledWithExactly( "the table", { checkConstraints: true, fireTriggers: true, keepNulls: true, tableLock: true }, sinon.match.func );
			} );
		} );
	} );
} );
