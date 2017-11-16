const { proxyquire, sinon } = testHelpers;

const EventEmitter = require( "events" ).EventEmitter;


describe( "connectionFactory", () => {
	describe( "when create resolves", () => {
		const expectedConfig = { is: "config" };

		let util,
			tedious,
			expectedConnection,
			connection,
			connectionBeginTransaction;

		before( async () => {
			util = {
				promisify: sinon.stub().returnsArg( 0 )
			};
			connectionBeginTransaction = sinon.stub();
			expectedConnection = Object.assign( new EventEmitter(), {
				beginTransaction: connectionBeginTransaction,
				commitTransaction: sinon.stub(),
				rollbackTransaction: sinon.stub(),
				reset: sinon.stub()
			} );

			tedious = {
				Connection: sinon.stub().returns( expectedConnection )
			};
			const factory = proxyquire( "src/connectionFactory", {
				tedious,
				util
			} );

			const connectionPromise = factory.create( expectedConfig );
			expectedConnection.emit( "connect" );
			connection = await connectionPromise;
		} );

		it( "should create tedious connection", () => {
			tedious.Connection.should.be.calledOnce()
				.and.calledWithNew()
				.and.calledWithExactly( expectedConfig );
		} );

		it( "should return connection", () => {
			connection.should.equal( expectedConnection );
		} );

		it( "should assign id to connection", () => {
			connection.id.should.be.a( "number" );
		} );

		it( "should promisify commitTransaction", () => {
			util.promisify.should.be.calledWithExactly( connection.commitTransaction );
		} );

		it( "should promisify rollbackTransaction", () => {
			util.promisify.should.be.calledWithExactly( connection.rollbackTransaction );
		} );

		it( "should promisify reset", () => {
			util.promisify.should.be.calledWithExactly( connection.reset );
		} );

		describe( "beginTransaction", () => {
			const expectedName = "STUFF";
			const expectedIsolationLevel = "YOLO";

			describe( "when successful", () => {
				let tx;
				before( () => {
					connectionBeginTransaction.resetHistory();
					connectionBeginTransaction.callsArg( 0 );
					tx = connection.beginTransaction( expectedName, expectedIsolationLevel );
				} );

				it( "should resolve", async () => {
					await tx;
				} );


				it( "should properly call tedious beginTransaction", () => {
					connectionBeginTransaction.should.be.calledOnce()
						.and.calledWithMatch( sinon.match.func, expectedName, expectedIsolationLevel );
				} );
			} );

			describe( "when it fails", () => {
				let tx, expectedError;
				before( () => {
					expectedError = new Error( "boom" );
					connectionBeginTransaction.resetHistory();
					connectionBeginTransaction.callsArgWith( 0, expectedError );
				} );

				it( "should reject", () => {
					return connection.beginTransaction( expectedName, expectedIsolationLevel )
						.should.be.rejectedWith( expectedError );
				} );
			} );
		} );
	} );
} );
