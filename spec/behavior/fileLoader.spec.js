const { proxyquire, sinon } = testHelpers;

describe( "fileLoader", () => {
	it( "should cache file text", async () => {
		const expected = "FIRST";
		const fs = {
			readFile: sinon.stub()
		};
		fs.readFile.callsArgWith( 2, null, expected );

		const loader = proxyquire( "src/fileLoader", {
			fs
		} )( x => x );

		await loader( "A" );
		await loader( "A" );

		fs.readFile.should.be.calledOnce();
	} );
} );
