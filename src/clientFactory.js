
const genericPool = require( "generic-pool" );

const Client = require( "./client" );
const configBuilder = require( "./configBuilder" );
const connectionFactory = require( "./connectionFactory" );

async function connect( config ) {
	const poolFactory = {
		create() {
			return connectionFactory.create( configBuilder.tedious( config ) );
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

	const conn = await poolFactory.create();
	conn.close();
	const pool = genericPool.createPool( poolFactory, configBuilder.connectionPool( config ) );
	return new Client( pool );
}

module.exports = connect;
