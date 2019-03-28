const genericPool = require( "generic-pool" );

const configBuilder = require( "./configBuilder" );
const connectionFactory = require( "./connectionFactory" );

function getResourceFactory( client, config ) {
	return {
		async create( ) {
			const conn = await connectionFactory.create( configBuilder.tedious( config ) );
			conn.on( "error", e => client.emit( "error", e ) );
			return conn;
		},
		validate( conn ) {
			if ( conn.state.name === "LoggedIn" ) {
				return conn.reset();
			}
			conn.close();
			return false;
		},
		destroy( conn ) {
			return conn.close();
		}
	};
}

module.exports = ( client, config ) => {
	const resourceFactory = getResourceFactory( client, config );
	return genericPool.createPool( resourceFactory, configBuilder.connectionPool( config ) );
};
