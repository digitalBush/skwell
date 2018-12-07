const { proxyquire, sinon } = testHelpers;

describe( "clientFactory", () => {
	let Client,
		configBuilder,
		connectionFactory,
		clientFactory,
		genericPool;

	const expectedClient = { is: "client" };
	const expectedPool = { is: "pool" };
	const expectedTediousConfig = { is: "tedious config" };
	const expectedPoolConfig = { is: "pool config" };

	function setup() {
		genericPool = {
			createPool: sinon.stub().returns( expectedPool )
		};

		configBuilder = {
			tedious: sinon.stub().returns( expectedTediousConfig ),
			connectionPool: sinon.stub().returns( expectedPoolConfig )
		};

		connectionFactory = {
			create: sinon.stub()
		};

		Client = sinon.stub().returns( expectedClient );

		clientFactory = proxyquire( "src/clientFactory", {
			"generic-pool": genericPool,
			"./client": Client,
			"./configBuilder": configBuilder,
			"./connectionFactory": connectionFactory
		} );
	}

	describe( "when connection succeeds", () => {
		let client,
			connection;

		before( async () => {
			connection = {
				close: sinon.stub().resolves()
			};

			setup();
			connectionFactory.create.resolves( connection );
			client = await clientFactory( {} );
		} );

		it( "should connect once", () => {
			connectionFactory.create.should.be.calledOnce()
				.and.calledWithExactly( expectedTediousConfig );
		} );

		it( "should close connection", () => {
			connection.close.should.be.calledOnce();
		} );

		it( "should configure pool", () => {
			const poolFactory = sinon.match( {
				create: sinon.match.func,
				validate: sinon.match.func,
				destroy: sinon.match.func
			} );

			genericPool.createPool.should.be.calledOnce()
				.and.calledWithMatch( poolFactory, expectedPoolConfig );
		} );

		it( "should create client with configured pool", () => {
			Client.should.be.calledOnce()
				.and.calledWithNew()
				.and.calledWithExactly( expectedPool );
		} );

		it( "should return client", () => {
			client.should.equal( expectedClient );
		} );
	} );

	describe( "when connection fails", () => {
		let clientPromise;
		before( async () => {
			setup();
			connectionFactory.create.rejects( new Error( "boom" ) );

			clientPromise = clientFactory( {
				password: "sekret",
				something: "else"
			} );

			try {
				await clientPromise;
			} catch ( e ) {}
		} );

		it( "should connect once", () => {
			connectionFactory.create.should.be.calledOnce()
				.and.calledWithExactly( expectedTediousConfig );
		} );

		it( "should be rejected", () => {
			return clientPromise.should.eventually
				.be.rejectedWith( "boom" );
		} );
	} );
} );
