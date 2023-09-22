const { proxyquire, sinon, expect } = testHelpers;


describe( "parameterBuilder", () => {
	let parameterBuilder, typeMapper, jsonTableType, jsonTableTypeConstructor;
	beforeEach( () => {
		typeMapper = {
			missingType: sinon.stub().returns( false ),
			valueToType: sinon.stub(),
			isObj: sinon.stub().returns( false ) };

		jsonTableType = {
			addToRequest: sinon.stub()
		};
		jsonTableTypeConstructor = sinon.stub().returns( jsonTableType );
		parameterBuilder = proxyquire( "src/parameterBuilder", {
			"./typeMapper": typeMapper,
			"./JsonTableType": jsonTableTypeConstructor
		} );
	} );

	it( "should infer type", () => {
		const type = {
			addToRequest: sinon.stub()
		};
		const req = "REQUEST";

		typeMapper.missingType.returns( true );
		typeMapper.valueToType.returns( type );
		parameterBuilder.addRequestParams( req, {
			lol: 123
		} );

		type.addToRequest.should.be.calledOnceWithExactly( req, "lol", 123 );
	} );

	it( "should expand type", () => {
		const type = {
			addToRequest: sinon.stub()
		};
		const req = "REQUEST";

		parameterBuilder.addRequestParams( req, {
			lol: {
				type: () => type,
				val: 123
			}
		} );

		type.addToRequest.should.be.calledOnceWithExactly( req, "lol", 123 );
	} );

	it( "should wrap object types", () => {
		const req = "REQUEST";
		typeMapper.isObj.returns( true );
		const val = [ { lol: 123 } ];

		parameterBuilder.addRequestParams( req, {
			lol: {
				type: {
					lol: "SOME TYPE"
				},
				val
			}
		} );
		jsonTableType.addToRequest.should.be.calledOnceWithExactly( req, "lol", val );
	} );

	it( "should error with an unknown type", () => {
		const req = "REQUEST";
		const val = [ { lol: 123 } ];

		expect( () => parameterBuilder.addRequestParams( req, {
			lol: {
				type: "BOOM",
				val
			}
		} ) ).to.throw( "Parameter lol has invalid type." );
	} );
} );
