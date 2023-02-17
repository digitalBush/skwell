const { proxyquire, sinon } = testHelpers;
const EventEmitter = require( "events" );

describe( "client", () => {
	let pool, result, action, poolFactory, Client;

	const expectedConnection = "CONNECTION";
	const expectedResult = "RESULT";

	function setup() {
		pool = Object.assign( new EventEmitter(), {
			acquire: sinon.stub().resolves( expectedConnection ),
			release: sinon.stub().resolves(),
			start: sinon.stub()
		} );

		poolFactory = sinon.stub().returns( pool );

		Client = proxyquire( "src/client", {
			"./poolFactory": poolFactory
		} );
	}

	describe( "when creating a client", () => {
		let client, config;

		before( () => {
			setup();
			config = {};
			client = new Client( config );
		} );

		it( "should start the pool", () => {
			pool.start.should.be.calledOnce();
		} );

		it( "should get a pool from the poolFactory", () => {
			poolFactory.should.be.calledOnce()
				.and.calledWithExactly( client, config );
		} );
	} );

	describe( "when pool cannot create db connection", () => {
		let client, fakeEmit;

		const someError = new Error( "Doh!" );

		before( () => {
			setup();
			fakeEmit = sinon.stub();
			client = new Client( {} );

			sinon.replace( client, "emit", fakeEmit );
			pool.emit( "factoryCreateError", someError );
		} );

		it( "emits error on client", () => {
			fakeEmit.should.be.calledOnce().and.calledWithExactly( "error", someError );
		} );
	} );

	describe( "when connection acquire succeeds", () => {
		before( async () => {
			setup();

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
		let error;
		const expectedError = new Error( "Boom" );

		before( async () => {
			setup();

			pool.acquire = sinon.stub().rejects( expectedError );
			pool.release.reset(); // reset call counts for pool.release

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
