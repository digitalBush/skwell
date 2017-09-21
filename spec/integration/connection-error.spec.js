const { config } = testHelpers;

const skwell = require( "src/" );
describe( "Connection Error - Integration", () => {
	it( "should fail when connecting to a bad server", async () => {
		const singleConnectionPoolConfig = Object.assign( {}, config, { database: "NOTREAL", connectTimeout: 1000 } );
		return skwell.connect( singleConnectionPoolConfig ).should.be.rejectedWith( "Failed to connect." );
	} );
} );
