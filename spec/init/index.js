require( "app-module-path/cwd" );
const chai = require( "./chai" );
const config = require( "./config" );
const sinon = require( "sinon" );

global.testHelpers = {
	expect: chai.expect,
	should: chai.should(),
	sinon,
	proxyquire: require( "proxyquire" ).noPreserveCache().noCallThru(),
	config
};
