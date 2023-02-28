on# Skwell
[![Build Status](https://travis-ci.org/digitalBush/skwell.svg?branch=master)](https://travis-ci.org/digitalBush/skwell)
[![Coverage Status](https://coveralls.io/repos/github/digitalBush/skwell/badge.svg)](https://coveralls.io/github/digitalBush/skwell)

A promised based SQL Server client with connection pooling.


## Setup

First we need to create a client.

``` js
const skwell = require("skwell");
const sql = skwell.connect( {
	username: "ima_user",
	password: "sekret",
	server: "localhost",
	database: "test",
	// Everything below is optional, values listed are defaults
	port: 1433,
	domain: null, // Only needed for NTLM auth
	pool: {
		min: 1,
		max: 10
	},
	connectTimeout: 15000, //ms
	requestTimeout: 15000, //ms
	encrypt: false,
	abortTransactionOnError: true,
	multiSubnetFailover: true,
	onBeginTransaction( tx ){
		// Executes at the beginning of transaction
	},
	onEndTransaction( tx ){
		// Executes at the end of transaction, right before commit
	},
} );

```

At this point, you have a client ( `sql` ) that is meant to be shared. A pool of connections is maintained in the background and one will be chosen for you to execute your queries.

This client is an event emitter and will emit an `error` event when there is a problem connecting to the server. You can handle that like so:

```js
sql.on( "error", err => {
	// handle the error things
} )
```
## API

### Methods

#### `query( cmd, [ params ]  )`
---
Used when query returns a single result set.

**Returns:** Promise that resolves array containing objects or an empty array if there are no rows.

**Example:**
```js
	const users = await sql.query(`
		SELECT userId, name
		FROM Users
		WHERE groupId = @groupId;
	`,{
		groupId: 7
	} );
```

#### `querySets( cmd, [ params ] )`
---
Used when query returns multiple result sets.

**Returns:** Promise that resolves array of arrays containing objects. Inner arrays will be empty if a query produces no rows.

**Example:**
```js
	const [ [ user ], emails ] = await sql.querySets( `
		SELECT userId, name
		FROM Users
		WHERE userId = @userId;

		SELECT userId, emailAddress
		FROM Emails
		WHERE userId = @userId;
	`, {
		userId: 42
	} );
```

#### `queryFirst( cmd, [ params ] )`
---
Used when query returns single row.

**Returns:** Promise that resolces object or null if there are no rows.

**Example:**
```js
	const {postId, title} = await sql.queryFirst( `
		SELECT postId, title
		FROM Posts
		WHERE postId = @postId;
	`, {
		postId: 13
	} );
```

#### `queryValue( cmd, [ params ] )`
---
Used when query returns single row with a single value.

**Returns:** Promise that resolves value or null if there are no rows.

**Example:**
```js
	const value = await sql.queryValue( `
		SELECT configValue
		FROM Configuration
		WHERE userId = @userId
		AND configKey = @key
	`, {
		key: 'showWelcomeScreen',
		userId: 42
	} );
```

#### `execute( cmd, [ params ] )`
---
Used when query returns no data.

**Returns:** Promise that resolves to number of affected rows.

**Example:**
```js
	const rowCount = await sql.execute( `
		UPDATE Users
		SET email = @email
		WHERE userId = @userId;
	`, {
		email: 'new@example.com',
		userId: 42
	} );
```

#### `queryStream( cmd, [ params ] )`
---
Used when you want to stream the data.

**Returns:** Stream in object mode that emits the following structures.

At the beginning of a result set you will receive the structure of the rows about to follow.
```js
{
	metadata: {
		columnNames: []
	}
}
```

After that, you'll receive an object per row.
```js
{
	row: { /* data */ }
}
```

**Example:**
```js
const { createWriteStream } = require( "node:fs" );
const { Transform } = require( "node:stream" );
const { pipeline } = require( "node:stream/promises" );

const simpleCsv = new Transform( {
	objectMode: true,
	transform( obj, _, cb ) {
		if ( obj.metadata ) {
			this.push( `${ obj.metadata.columnNames.join( "," ) }\n` );
		} else if ( obj.row ) {
			this.push( `${ Object.keys( obj.row ).map( k => obj.row[ k ] ).join( "," ) }\n` );
		}
		cb();
	}
} );

const query = `
	SELECT *
	FROM SomeBigTable
`;

await pipeline( sql.queryStream( query ), simpleCsv, createWriteStream( file ) );
```

#### `executeBatch( statement )`
---
Used when executing DDL statements that can't be run via `sp_executesql`.
>*Note:* there is no param support.

**Returns:** Promise that resolves to number of affected rows.

**Example:**
```js
	const rowCount = await sql.executeBatch( `
		CREATE TABLE Foo( bar nvarchar(20) );
	`);
```


#### `bulkLoad( tableName, options )`
---
Used to bulk load data into tables.

**Arguments:**
* `tableName` - name of permanent or temporary table.
	>*Note:* temp tables are only supported within transactions.
* `options` - object with the following properties:
 ```js
	{
		schema: {},
		rows: [],
		// Everything below is optional, values listed are defaults
		create: false,
		checkConstraints: false,
		fireTriggers: false,
		keepNulls: false,
		tableLock: false
	}
```

`schema` is an object with the column name as the key and the value is a type. It looks like the `type` you use for table based params listed below. Types have a `.nullable()` decorator that is used for bulk loading into nullable columns.

`rows` is an array of objects in the shape as defined by your scehma above.

**Returns:** Promise that resolves to number of affected rows.

**Example:**
```js
	await sql.transaction( tx=> {
		const rowCount = await tx.bulkLoad("#test",{
			schema: {
				id: sql.bigint,
				name: sql.nvarchar(50).nullable()
			},
			rows: [
				{ id: 1, name: "Test" },
				{ id: 2, name: null }
			],
			create: true
		});

		// That data is available within the transaction
		const data = await tx.query("SELECT * FROM #test");
	} );

	// But this will throw because #test isn't there.
	// const data = await sql.query("SELECT * FROM #test");

```

#### `transaction( action, [options] )`
---
Execute several commands on the same connection in a transaction.

**Arguments:**
* `action` - async function taking one argument which is a transactional client that has the same api as above. If this resolves, the transaction will be committed. If it rejects, the transaction will be rolled back.
	>*Note:* `onBeginTransaction` / `onEndTransaction` callbacks from client initialization will run run before and after `action`.

* `options` - object with the following properties:
 ```js
	{
		context: null,
		isolationLevel: sql.read_committed
	}
```

`context` - This will be set as the `context` property on the transactional client.
`isolationLevel` - Defaults to `read committed`.


**Returns:** Promise that resolves to value returned from action callback above.

**Example:**
```js
// Passed as 2nd argument to `.transaction` below
const opts = {
	isolationLevel: sql.read_uncommitted,
	context: { userId: 123 } // This is set on the transaction
};

const result = await sql.transaction( async tx => {
	const { userId } = tx.context; // context from opt.context above
	const groupId = 89;

	await tx.execute(
		"INSERT INTO Users(id, name) VALUES(@id, @name)",
		{
			id: userId,
			name: "josh"
		} );

	await tx.execute(
		"INSERT INTO Groups(id, userId) VALUES(@groupId, @userId)",
		{
			groupId,
			userId,
		} );
}, opts );

```


#### `dispose`
---

### Commands
In the above examples, when you see `cmd` that can be a string or a promise containing a string containing the statements to be execute. Additionally we provide a few helpers.

#### `file( relativePath )`
---
Loads and caches a file relative to the calling code. If no file extension is supplied, `.sql` is assumed.

**Example:**
```sql
	-- src/sql/foo.sql
	SELECT id, name
	FROM foo
	WHERE bar = @bar;
```
```js
	// src/whatever.js
	const { id, name } = await sql.queryFirst(
		sql.file( "sql/foo" ),
		{ bar:"bar" }
	);
```


#### `sproc( name )`
---
Run a stored procedure. Result will be wrapped in an object that also contains the return value from stored procedure.

**Wrapped Result:**
```js
{
	result, // the data normally returned from method as described above
	returnValue // value from RETURN statement in stored procedure
}
```

**Example:**
```js
	const {
		result: { attribute_id, attribute_name, attribute_value },
		returnCode
	} = await sql.queryFirst(
		sql.sproc( "sp_server_info" ), {
		attribute_id: 1
	} );

	// compared with the same sproc executed within SQL statement

	const {
		attribute_id,
		attribute_name,
		attribute_value
	} = await sql.queryFirst(
		"EXEC sp_server_info @attribute_id", {
		attribute_id: 1
	} )


```

### Params
---

TODO

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
