const { config } = testHelpers;

const skwell = require( "src" );
describe( "Connection Error - Integration", () => {
	it( "should fail when connecting to a bad server", done => {
		const singleConnectionPoolConfig = Object.assign( {}, config, { database: "NOTREAL", connectTimeout: 1000 } );

		const client = skwell.connect( singleConnectionPoolConfig );
		client.on( "error", err => {
			err.message.should.equal( `Login failed for user '${ config.username }'.` );
			done();
		} );
	} );
} );
