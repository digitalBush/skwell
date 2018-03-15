const clientFactory = require( "./clientFactory" );
const Api = require( "./api" );
const Client = require( "./client" );

module.exports = {
	connect: clientFactory,
	Api,
	Client
};
