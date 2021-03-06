const { proxyquire, sinon } = testHelpers;
const EventEmitter = require( "events" );

describe( "poolFactory", () => {
	let poolFactory,
		configBuilder,
		connectionFactory,
		genericPool,
		pool,
		conn,
		client;

	const expectedTediousConfig = { is: "tedious config" };
	const expectedPoolConfig = { is: "pool config" };

	function setup() {
		pool = new EventEmitter();
		conn = new EventEmitter();
		client = new EventEmitter();

		genericPool = {
			createPool: sinon.stub().returns( pool )
		};

		configBuilder = {
			tedious: sinon.stub().returns( expectedTediousConfig ),
			connectionPool: sinon.stub().returns( expectedPoolConfig )
		};

		connectionFactory = {
			create: sinon.stub().resolves( conn )
		};

		poolFactory = proxyquire( "src/poolFactory", {
			"generic-pool": genericPool,
			"./configBuilder": configBuilder,
			"./connectionFactory": connectionFactory
		} );
	}

	describe( "when using poolFactory", () => {
		const poolFactoryMatcher = sinon.match( {
			create: sinon.match.func,
			validate: sinon.match.func,
			destroy: sinon.match.func
		} );

		before( async () => {
			setup();
			poolFactory( {}, {} );
		} );


		it( "should make a call to get a generic pool", () => {
			genericPool.createPool.should.be.calledOnce()
				.and.calledWithMatch( poolFactoryMatcher, expectedPoolConfig );
		} );
	} );

	describe( "when validating the connection", () => {
		let resourceFactory;

		before( async () => {
			setup();

			// use the poolFactory to generate a pool (stub 'pool' is returned from genericPool.createPool)
			poolFactory( client, {} );

			// get the original resourceFactory so that we can setup the on error handler
			resourceFactory = genericPool.createPool.getCall( 0 ).args[ 0 ];
		} );

		describe( "when the state name is Logged In", () => {
			describe( "when resetting the connection fails", () => {
				it( "should resolve to false", async () => {
					const result = await resourceFactory.validate( {
						state: { name: "LoggedIn" },
						reset: sinon.stub().rejects()
					} );
					result.should.be.false();
				} );
			} );

			describe( "when resetting the connection succeeds", () => {
				it( "should resolve to true", async () => {
					const result = await resourceFactory.validate( {
						state: { name: "LoggedIn" },
						reset: sinon.stub().resolves()
					} );
					result.should.be.true();
				} );
			} );
		} );

		describe( "when the state name is something else", () => {
			it( "should close the connection", async () => {
				const close = sinon.stub().resolves();
				await resourceFactory.validate( { state: {}, close } );
				close.should.be.calledOnce();
			} );

			it( "should resolve to false", async () => {
				const close = sinon.stub().resolves();
				const result = await resourceFactory.validate( { state: {}, close } );
				result.should.be.false();
			} );

			it( "should not break if the connection close fails", async () => {
				const close = sinon.stub().rejects();
				const result = await resourceFactory.validate( { state: {}, close } );
				result.should.be.false();
			} );
		} );
	} );

	describe( "when connection resource emits an error", () => {
		let fakeEmit;

		const connectionError = new Error( "tedious error" );

		before( async () => {
			setup();

			// stub the client emit fn
			fakeEmit = sinon.stub();
			sinon.replace( client, "emit", fakeEmit );

			// use the poolFactory to generate a pool (stub 'pool' is returned from genericPool.createPool)
			poolFactory( client, {} );

			// get the original resourceFactory so that we can setup the on error handler
			const resourceFactory = genericPool.createPool.getCall( 0 ).args[ 0 ];
			await resourceFactory.create(); // this returns the conn stub

			// now that conn has the on error handler we can emit the error
			conn.emit( "error", connectionError );
		} );

		it( "re-emits the error on the client", async () => {
			fakeEmit.should.be.calledOnce().and.calledWithExactly( "error", connectionError );
		} );
	} );
} );
