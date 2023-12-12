# Skwell
[![Build Status](https://github.com/digitalbush/skwell/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/digitalBush/skwell/actions/workflows/test.yml?query=branch%3Amaster)
[![Coverage Status](https://coveralls.io/repos/github/digitalBush/skwell/badge.svg)](https://coveralls.io/github/digitalBush/skwell)

A promised based SQL Server client with connection pooling.

## Getting Started

First we need to create a client.

``` js
const skwell = require("skwell");
const sql = skwell.connect( {
	username: "ima_user",
	password: "sekret",
	server: "localhost",
	database: "test",
	domain: "lol.com", // Used for NTLM auth, omit if using standard auth
	// Everything below is optional, values listed are defaults
	port: 1433,
	pool: {
		min: 1,
		max: 10
	},
	connectTimeout: 15000, //ms
	requestTimeout: 15000, //ms
	encrypt: false,
	onBeginTransaction( tx ){
		// Executes at the beginning of transaction
	},
	onEndTransaction( tx ){
		// Executes at the end of transaction, right before commit
	},
} );

```
*NOTE:* Setting `pool:false` will disable pooling entirely.

At this point, you have a client (`sql`) that is ready to be used non-transactionally. A pool of connections is maintained in the background and one will be chosen for you to execute your queries. Queries will resolve with the values or be rejected with an error.

Server errors(like when the server goes away) will be emitted on this client and can be handled accordingly.

```js
sql.on( "error", err => {
	// handle the error things
} )
```
The signature of everything except `bulkLoad` takes a query as the first argument. This query can be a string or a promise that resolves to a string. Skwell provides a `sql.file( "./relative.file.sql" )` method to load a file and cache the resulting text. If you are calling a stored procedure, use `sql.sproc( "name of stored procedure" )`.

Now, let's make some noise.
``` js
// execute, returns the number of rows affected
const insertedCount = await sql.execute(
	"INSERT INTO SuperCoolPeople (name) values(@name)",
	{
		name: { val: "josh", type: sql.nvarchar( 20 ) }
	} );

// executeBatch, returns the number of rows affected
// use this when executing DDL statements that can't be run via sp_executesql
await sql.executeBatch(
	"CREATE TABLE lol (id int);"
)

// querySets, returns an array of object arrays
const usersWithPageInfo = await sql.querySets( query, params );

// query, returns an array of objects
const users = await sql.query( query, params );

// queryFirst, returns first row as a single object
const user = await sql.queryFirst( query, params );

// queryValue, returns first value of first row
const userId = await sql.queryValue( query, params );

// queryStream, returns a stream of objects generated from the rows
// use this when you don't want to bring the entire data set into memory at once.
const userStream = await sql.queryStream( query, params );

// bulkLoad, returns the number of rows inserted
const insertedCount = await sql.bulkLoad( "SomeTable", {
	schema: {
		id: sql.int.nullable()
	},
	rows: [ { id: 1 }, { id: 2 }, { id: 3 } ]
} );

```

If you need to pass an array of parameters into your query, there are two ways to do so.

### Simple Values
Assign `val` to an array of simple values(strings, numbers, etc.) and `type` to be the sql type of each item. Skwell will expand the parameter list and create one parameter per value.
``` js
await sql.query( "select * from my_table where id in @ids", {
	ids: {
		val: [ 1, 2, 3 ],
		type: sql.int
	} );
// query gets expanded to "select * from my_table where id in (@ids0, @ids1, @ids2)
```

If you pass in an empty array, skwell will instead provide SQL that generates an empty set.
``` js
await sql.query( "select * from my_table where id in @ids", {
	ids: {
		val: [],
		type: sql.int
	} );
// query gets expanded to "select * from my_table where id in (SELECT 1 WHERE 1=0)
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

// Passed as 2nd argument to `.transaction` below
const opts = {
	isolationLevel: sql.read_uncommitted,
	context: { userId: 123 } // This is set on the transaction
};

const result = await sql.transaction( async tx => {
	const { userId } = tx.context; // context from opt.context above
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
}, opts );

// At this point, the transaction will be committed for you.
// If something would have broken, the transaction would have been rolled back.
```
That's about it. 👍
## Running the tests (Dockerized SQL Server)
**HEADS UP:** sql server needs 3.5gb of ram. You'll want to allocate more resources in docker.
1. `npm install`
1. `npm run sql:start` to get a local instance of sql server
1. `npm test`
