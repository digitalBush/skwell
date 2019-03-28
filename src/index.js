const Api = require( "./api" );
const Client = require( "./client" );
const Transaction = require( "./transaction" );

module.exports = {
	connect( config ) { return new Client( config ); },
	Api,
	Client,
	Transaction
};
