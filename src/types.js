/* eslint-disable camelcase */
/* eslint-disable no-magic-numbers */
const { TYPES } = require( "tedious" );

const TypeWrapper = require( "./TypeWrapper" );
const TvpType = require( "./TvpType" );

const { max } = TypeWrapper;

const types = {
	bigint: () => new TypeWrapper( TYPES.BigInt ),
	binary: ( length = 8000 ) => new TypeWrapper( TYPES.Binary, { length } ),
	bit: () => new TypeWrapper( TYPES.Bit ),
	char: ( length = 8000 ) => new TypeWrapper( TYPES.Char, { length } ),
	date: () => new TypeWrapper( TYPES.Date ),
	datetime: () => new TypeWrapper( TYPES.DateTime ),
	datetime2: ( scale = 7 ) => new TypeWrapper( TYPES.DateTime2, { scale } ),
	datetimeoffset: ( scale = 7 ) => new TypeWrapper( TYPES.DateTimeOffset, { scale } ),
	decimal: ( precision = 18, scale = 0 ) => new TypeWrapper( TYPES.Decimal, { precision, scale } ),
	float: () => new TypeWrapper( TYPES.Float ),
	image: () => new TypeWrapper( TYPES.Image ),
	int: () => new TypeWrapper( TYPES.Int ),
	money: () => new TypeWrapper( TYPES.Money ),
	nchar: ( length = 4000 ) => new TypeWrapper( TYPES.NChar, { length } ),
	ntext: () => new TypeWrapper( TYPES.NText ),
	numeric: ( precision = 18, scale = 0 ) => new TypeWrapper( TYPES.Numeric, { precision, scale } ),
	nvarchar: ( length = 4000 ) => new TypeWrapper( TYPES.NVarChar, { length } ),
	real: () => new TypeWrapper( TYPES.Real ),
	smalldatetime: () => new TypeWrapper( TYPES.SmallDateTime ),
	smallint: () => new TypeWrapper( TYPES.SmallInt ),
	smallmoney: () => new TypeWrapper( TYPES.SmallMoney ),
	text: () => new TypeWrapper( TYPES.Text ),
	time: ( scale = 7 ) => new TypeWrapper( TYPES.Time, { scale } ),
	tinyint: () => new TypeWrapper( TYPES.TinyInt ),
	udt: () => new TypeWrapper( TYPES.UDT ),
	uniqueidentifier: () => new TypeWrapper( TYPES.UniqueIdentifier ),
	varbinary: ( length = 8000 ) => new TypeWrapper( TYPES.VarBinary, { length } ),
	varchar: ( length = 8000 ) => new TypeWrapper( TYPES.VarChar, { length } ),
	variant: () => new TypeWrapper( TYPES.Variant ),
	xml: () => new TypeWrapper( TYPES.Xml )
};
types.tvp = cols => new TvpType( cols );

Object.keys( types ).forEach( key => {
	types[ key ].nullable = function( val ) {
		return types[ key ]().nullable( val );
	};
} );

module.exports = {
	...types,
	varbinary_max: types.varbinary( max ),
	varchar_max: types.varchar( max ),
	nvarchar_max: types.nvarchar( max ),
	max
};
