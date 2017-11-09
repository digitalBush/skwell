const { sinon } = testHelpers;
const Client = require( "src/client" );

describe( "client", () => {
	describe( "when connection acquire succeeds", () => {
		let pool, result, action;
		const expectedConnection = "CONNECTION";
		const expectedResult = "RESULT";

		before( async () => {
			pool = {
				acquire: sinon.stub().resolves( expectedConnection ),
				release: sinon.stub().resolves()
			};
			action = sinon.stub().resolves( expectedResult );
			const client = new Client( pool );
			result = await client.withConnection( action );
		} );

		it( "should return correct result", () => {
			result.should.equal( "RESULT" );
		} );

		it( "should acquire connection", () => {
			pool.acquire.should.be.calledOnce().and.calledWithExactly();
		} );

		it( "should call action with connection", () => {
			action.should.be.calledOnce().and.calledWithExactly( expectedConnection );
		} );

		it( "should release connection", async () => {
			pool.release.should.be.calledOnce().and.calledWithExactly( expectedConnection );
		} );
	} );

	describe( "when connection acquire fails", () => {
		let pool, error, action;
		const expectedError = new Error( "Boom" );

		before( async () => {
			pool = {
				acquire: sinon.stub().rejects( expectedError ),
				release: sinon.stub().resolves()
			};
			action = sinon.stub().resolves();
			const client = new Client( pool );
			try {
				await client.withConnection( action );
			} catch ( e ) {
				error = e;
			}
		} );

		it( "should error", () => {
			error.should.equal( expectedError );
		} );

		it( "should acquire connection", () => {
			pool.acquire.should.be.calledOnce().and.calledWithExactly();
		} );

		it( "should not try to release connection", async () => {
			pool.release.should.not.be.called();
		} );
	} );
} );
