const { proxyquire, sinon } = testHelpers;

describe( "fileLoader", () => {
	it( "should cache file text", async () => {
		const expected = "FIRST";
		const fs = {
			readFile: sinon.stub()
		};
		fs.readFile.onCall( 0 ).callsArgWith( 2, null, expected );
		fs.readFile.onCall( 1 ).throws( new Error( "you failed" ) );

		const loader = proxyquire( "src/fileLoader", {
			fs
		} );

		const firstCall = await loader( "A" );
		const secondCall = await loader( "A" );

		firstCall.should.equal( expected );
		secondCall.should.equal( expected );
	} );
} );
