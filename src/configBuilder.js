const DEFAULT_TIMEOUT = 15000;
const DEFAULT_PORT = 1433;

function connectionPool( config ) {
	const { pool = {}, connectTimeout = DEFAULT_TIMEOUT } = config;

	const poolConfig = Object.assign( { min: 1, max: 10, acquireTimeoutMillis: connectTimeout }, pool );
	poolConfig.testOnBorrow = true;
	return poolConfig;
}

function tedious( config ) {
	const { username, password, server, domain, port = DEFAULT_PORT, database, connectTimeout = DEFAULT_TIMEOUT } = config;
	return {
		userName: username,
		password,
		server,
		domain,
		options: {
			port,
			database,
			connectTimeout
		}
	};
}

module.exports = {
	connectionPool,
	tedious
};
