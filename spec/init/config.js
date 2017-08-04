const defaults = {
	username: "sa",
	password: "P@ssw0rd",
	server: "localhost",
	database: "master"
};

let localConfig = {};
try {
	localConfig = require( "../config.local" );
} catch ( e ) { }

module.exports = Object.assign( defaults, localConfig );
