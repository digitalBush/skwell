const { proxyquire, sinon } = testHelpers;

describe( "fileLoader", () => {
	const expected = "SELECT lol";

	describe( "CommonJS", () => {
		let loader, fs;
		beforeEach( () => {
			fs = {
				readFile: sinon.stub().resolves( expected )
			};
			const callsite = {
				getFileName: sinon.stub().returns( "/Users/josh/caller.cjs" )
			};

			loader = proxyquire( "src/fileLoader", {
				"node:fs/promises": fs,
				callsites: () => [ {}, callsite ]
			} );
		} );

		[ "lol", "lol.sql", "./lol", "./lol.sql" ].forEach( f => {
			it( `should load file from same directory: ${ f }`, async () => {
				const query = await loader( f );
				fs.readFile.should.be.calledOnceWithExactly( "/Users/josh/lol.sql", "utf8" );
				query.should.equal( expected );
			} );
		} );

		[ "queries/lol", "queries/lol.sql", "./queries/lol", "./queries/lol.sql" ].forEach( f => {
			it( `should load file from nested directory: ${ f }`, async () => {
				const query = await loader( f );
				fs.readFile.should.be.calledOnceWithExactly( "/Users/josh/queries/lol.sql", "utf8" );
				query.should.equal( expected );
			} );
		} );

		it( "should cache file", async () => {
			const query1 = await loader( "once" );
			const query2 = await loader( "once.sql" );
			fs.readFile.should.be.calledOnceWithExactly( "/Users/josh/once.sql", "utf8" );
			query1.should.equal( expected );
			query2.should.equal( expected );
		} );
	} );

	describe( "ES modules", () => {
		let loader, fs;
		beforeEach( () => {
			fs = {
				readFile: sinon.stub().resolves( expected )
			};
			const callsite = {
				getFileName: sinon.stub().returns( "file:///Users/josh/caller.cjs" )
			};

			loader = proxyquire( "src/fileLoader", {
				"node:fs/promises": fs,
				callsites: () => [ {}, callsite ]
			} );
		} );

		[ "lol", "lol.sql", "./lol", "./lol.sql" ].forEach( f => {
			it( `should load file from same directory: ${ f }`, async () => {
				const query = await loader( f );
				fs.readFile.should.be.calledOnceWithExactly( "/Users/josh/lol.sql", "utf8" );
				query.should.equal( expected );
			} );
		} );

		[ "queries/lol", "queries/lol.sql", "./queries/lol", "./queries/lol.sql" ].forEach( f => {
			it( `should load file from nested directory: ${ f }`, async () => {
				const query = await loader( f );
				fs.readFile.should.be.calledOnceWithExactly( "/Users/josh/queries/lol.sql", "utf8" );
				query.should.equal( expected );
			} );
		} );

		it( "should cache file", async () => {
			const query1 = await loader( "once" );
			const query2 = await loader( "once.sql" );
			fs.readFile.should.be.calledOnceWithExactly( "/Users/josh/once.sql", "utf8" );
			query1.should.equal( expected );
			query2.should.equal( expected );
		} );
	} );
} );
