const { sinon, proxyquire } = testHelpers;

describe( "RequestStream", () => {
	let RequestStream, request;
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
	} );

	it( "should init inherited stream correctly", () => {
		const stream = new RequestStream();
		stream._readableState.should.have.property( "objectMode", true );
		stream._readableState.should.have.property( "emitClose", true );
	} );

	describe( "when destroying", () => {
		let requestStream;
		beforeEach( () => {
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
