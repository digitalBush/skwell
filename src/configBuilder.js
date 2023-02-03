const DEFAULT_CONNECT_TIMEOUT = 15000;
const DEFAULT_REQUEST_TIMEOUT = 15000;
const DEFAULT_PORT = 1433;
const DEFAULT_AUTHENTICATION_TYPE = "default";
const NTLM_AUTHENTICATION_TYPE = "ntlm";

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
		abortTransactionOnError = true,
		multiSubnetFailover = true } = config;
	const authenticationType = config.authenticationType ||
		( domain ? NTLM_AUTHENTICATION_TYPE : DEFAULT_AUTHENTICATION_TYPE );
	return {
		authentication: {
			type: authenticationType,
			options: {
				userName: username,
				password,
				domain
			}
		},
		server,
		options: {
			port,
			database,
			connectTimeout,
			requestTimeout,
			encrypt,
			abortTransactionOnError,
			validateBulkLoadParameters: true,
			multiSubnetFailover
		}
	};
}

module.exports = {
	connectionPool,
	tedious
};
