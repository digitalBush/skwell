# Skwell
[![Build Status](https://travis-ci.org/digitalBush/skwell.svg?branch=master)](https://travis-ci.org/digitalBush/skwell)
[![Coverage Status](https://coveralls.io/repos/github/digitalBush/skwell/badge.svg)](https://coveralls.io/github/digitalBush/skwell)

A promised based SQL Server client with connection pooling.

## Getting Started

First we need to create a client.

``` js
const skwell = require("skwell");
const sql = await sqwell.connect( {
	username: "ima_user",
	password: "sekret",
	server: "localhost",
	database: "test",
	pool: {
		min: 1,
		max: 10
	}
} );

```

At this point, you have a client (`sql`) that is ready to be used non-transactionally. A pool of connections is maintained in the background and one will be chosen for you to execute your queries.

Now, let's make some noise.
``` js
//mutation
const insertedCount = await sql.execute(
	"INSERT INTO SuperCoolPeople (name) values(@name)",
	{
		name: { val: "josh", type: sql.nvarchar( 20 ) }
	} );

// query, returns an array of objects
const users = await sql.query( query, params );

// query, returns a stream
const userStream = await sql.queryStream( query, params );

// query first row, returns a single object
const user = await sql.queryFirst( query, params );

// query first column from first row, returns a single value
const userId = await sql.queryValue( query, params );

```

If you need to pass an array of parameters into your query, there are two ways to do so.

### Simple Values
Assign `val` to an array of simple values(strings, numbers, etc.) and `type` to be the sql type of each item. Skwell will create a table parameter with a single column named `value`
``` js
await sql.query( "select value from @ids", {
	ids: {
		val: [ 1, 2, 3 ],
		type: sql.int
	} );
// [ { value: 1 }, { value: 2 }, { value: 3 } ]
```

### Complex Values
Assign `val` to an array of objects and `type` to an object mapping properties to a sql type. Skwell will create a table paramater with multiple columns named after the object keys defined in `type`.
``` js
await sql.query( "select name from @people", {
	people: {
		val: [
			{ id: 1, name: "Josh" },
			{ id: 2, name: "Calvin" },
			{ id: 3, name: "Jim"}
		],
		type: {
			id: sql.int,
			name: sql.nvarchar(100)
		}
	 } );
// [ { name: "Josh" }, { name: "Calvin" }, { name: "Jim" } ]
```


Sometimes you need to execute multiple queries in a transaction. Don't worry, we've got you covered!

``` js

const result = await sql.transaction( sql.read_uncommitted, tx => {
	const userId = 11;
	const groupId = 89;

	await tx.execute(
		"INSERT INTO Users(id, name) values(@id, @name)",
		{
			id: { val: userId, type: sql.int },
			name: { val: "josh", type: sql.nvarchar( 20 ) }
		} );

	await tx.execute(
		"INSERT INTO Groups(id, userId) values(@id, @userId)",
		{
			id: { val: groupId, type: sql.int },
			userId: { val: userId, type: sql.int }
		} );
});

// At this point, the transaction will be committed for you.
// If something would have broken, the transaction would have been rolled back.
```
That's about it. 👍
## Running the tests (Dockerized SQL Server)
**HEADS UP:** sql server needs 3.5gb of ram. You'll want to allocate more resources in docker.
1. `npm install`
1. `npm run sql:start` to get a local instance of sql server
1. `npm test`
