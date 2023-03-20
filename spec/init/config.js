const defaults = {
	username: "sa",
	password: "P@ssw0rd",
	server: "localhost",
	database: "master",
	port: 1434
};

let localConfig = {};
try {
	localConfig = require( "../config.local" );
} catch ( e ) { /* noop*/ }

module.exports = Object.assign( defaults, localConfig );
