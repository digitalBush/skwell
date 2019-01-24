const DEFAULT_CONNECT_TIMEOUT = 15000;
const DEFAULT_REQUEST_TIMEOUT = 15000;
const DEFAULT_PORT = 1433;

function connectionPool( config ) {
	const { pool = {}, connectTimeout = DEFAULT_CONNECT_TIMEOUT } = config;

	const poolConfig = Object.assign( { min: 1, max: 10, acquireTimeoutMillis: connectTimeout }, pool );
	poolConfig.testOnBorrow = true;
	return poolConfig;
}

function tedious( config ) {
	const {
		username,
		password,
		server,
		domain,
		port = DEFAULT_PORT,
		database,
		connectTimeout = DEFAULT_CONNECT_TIMEOUT,
		requestTimeout = DEFAULT_REQUEST_TIMEOUT,
		encrypt = false,
		abortTransactionOnError = true } = config;
	return {
		userName: username,
		password,
		server,
		domain,
		options: {
			port,
			database,
			connectTimeout,
			requestTimeout,
			encrypt,
			abortTransactionOnError
		}
	};
}

module.exports = {
	connectionPool,
	tedious
};
