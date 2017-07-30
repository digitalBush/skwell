# Skwell

A proof of concept promise based MS SQL library.

## Getting Started

First we need to create a client.

``` js
const skwell = require("skwell");
const sql = sqwell.connect( {
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

// query first row, returns a single object
const user = await sql.queryFirst( query, params );

// query first column from first row, returns a single value
const userId = await sql.queryValue( query, params );

```

Sometimes you need to execute multiple queries in a transaction. Don't worry, we've got you covered!

``` js

const result = await sql.transaction( sql.read_uncommitted, tx = {
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



