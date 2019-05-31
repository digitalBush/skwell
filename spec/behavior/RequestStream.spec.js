const { sinon, proxyquire } = testHelpers;

describe( "RequestStream", () => {
	describe( "when destroying", () => {
		let RequestStream, requestStream, request;

		beforeEach( () => {
			request = {
				on: sinon.stub()
			};
			const Request = sinon.stub().returns( request );
			RequestStream = proxyquire( "src/RequestStream", {
				tedious: {
					Request
				}
			} );
			requestStream = new RequestStream();
		} );

		describe( "when a connection is not present", () => {
			it( "should not error", () => {
				( () => {
					requestStream._destroy( "ERR", () => {} );
				} ).should.not.throw();
			} );
		} );

		describe( "when a connection is present", () => {
			it( "should call connection.cancel", () => {
				const cancel = sinon.stub();
				request.connection = { cancel };
				requestStream._destroy( "ERR", () => {} );
				cancel.should.be.calledOnce();
			} );
		} );
	} );
} );
