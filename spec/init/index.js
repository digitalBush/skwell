require( "app-module-path/cwd" );
const chai = require( "./chai" );
const config = require( "./config" );

global.testHelpers = {
	expect: chai.expect,
	should: chai.should(),
	config
};
