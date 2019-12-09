const configBuilder = require( "src/configBuilder" );

describe( "configBuilder", () => {
	describe( "connectionPool config mapper", () => {
		it( "should map defaults", () => {
			configBuilder.connectionPool( {} ).should.eql( {
				acquireTimeoutMillis: 15000,
				max: 10,
				min: 1,
				testOnBorrow: true
			} );
		} );

		it( "should set acquireTimeoutMillis when value is provided", () => {
			const config = { pool: { acquireTimeoutMillis: 88 } };
			configBuilder.connectionPool( config ).acquireTimeoutMillis.should.equal( 88 );
		} );

		it( "should set min when value is provided", () => {
			const config = { pool: { min: 2 } };
			configBuilder.connectionPool( config ).min.should.equal( 2 );
		} );

		it( "should set max when value is provided", () => {
			const config = { pool: { max: 12 } };
			configBuilder.connectionPool( config ).max.should.equal( 12 );
		} );

		it( "should set acquireTimeoutMillis when value is provided", () => {
			const config = { pool: { acquireTimeoutMillis: 88 } };
			configBuilder.connectionPool( config ).acquireTimeoutMillis.should.equal( 88 );
		} );

		it( "should not allow override of testOnBorrow, even when value is provided", () => {
			const config = { pool: { testOnBorrow: false }, testOnBorrow: false };
			configBuilder.connectionPool( config ).testOnBorrow.should.equal( true );
		} );

		it( "should set acquireTimeoutMillis from connectTimeout when present sans acquireTimeoutMillis", () => {
			const config = { connectTimeout: 99 };
			configBuilder.connectionPool( config ).acquireTimeoutMillis.should.equal( 99 );
		} );
	} );

	describe( "tedious config mapper", () => {
		it( "should have defaults", () => {
			configBuilder.tedious( {} ).should.eql( {
				authentication: {
					type: "default",
					options: {
						domain: undefined,
						password: undefined,
						userName: undefined
					}
				},
				options: {
					abortTransactionOnError: true,
					connectTimeout: 15000,
					database: undefined,
					encrypt: false,
					port: 1433,
					requestTimeout: 15000
				},
				server: undefined
			} );
		} );

		it( "should set authentication type when value is provided", () => {
			const result = configBuilder.tedious( { authenticationType: "secretHandshake" } );
			result.authentication.type.should.equal( "secretHandshake" );
		} );

		it( "should set username when value is provided", () => {
			const result = configBuilder.tedious( { username: "ima-username" } );
			result.authentication.options.userName.should.equal( "ima-username" );
		} );

		it( "should set password when value is provided", () => {
			const result = configBuilder.tedious( { password: "12345" } );
			result.authentication.options.password.should.equal( "12345" );
		} );

		it( "should set server when value is provided", () => {
			const result = configBuilder.tedious( { server: "ima-server" } );
			result.server.should.equal( "ima-server" );
		} );

		it( "should set domain when value is provided", () => {
			const result = configBuilder.tedious( { domain: "ima-domain" } );
			result.authentication.options.domain.should.equal( "ima-domain" );
		} );

		it( "should use ntlm authentication when no authentication type is provided, but domain is provided", () => {
			const result = configBuilder.tedious( { domain: "ima-domain" } );
			result.authentication.type.should.equal( "ntlm" );
		} );

		it( "should set port when value is provided", () => {
			const result = configBuilder.tedious( { port: 9099 } );
			result.options.port.should.equal( 9099 );
		} );

		it( "should set database when value is provided", () => {
			const result = configBuilder.tedious( { database: "ima-db" } );
			result.options.database.should.equal( "ima-db" );
		} );

		it( "should set connectTimeout when value is provided", () => {
			const result = configBuilder.tedious( { connectTimeout: 2 } );
			result.options.connectTimeout.should.equal( 2 );
		} );

		it( "should set requestTimeout when value is provided", () => {
			const result = configBuilder.tedious( { requestTimeout: 3 } );
			result.options.requestTimeout.should.equal( 3 );
		} );

		it( "should set encrypt when value is provided", () => {
			const result = configBuilder.tedious( { encrypt: true } );
			result.options.encrypt.should.be.true();
		} );

		it( "should set abortTransactionOnError when value is provided", () => {
			const result = configBuilder.tedious( { abortTransactionOnError: false } );
			result.options.abortTransactionOnError.should.be.false();
		} );
	} );
} );
