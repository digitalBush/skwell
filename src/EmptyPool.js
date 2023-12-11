const EventEmitter = require( "events" );
class EmptyPool extends EventEmitter {

	constructor( { create, destroy } ) {
		super();

		this.acquire = create;
		this.release = destroy;
	}

	drain() { return Promise.resolve(); }
	clear() { /* Nothing to do */ }

}

module.exports = EmptyPool;
