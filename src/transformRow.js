module.exports = function transformRow( row ) {
	// TODO: maybe we need to make some decisions based on the sql type?
	// TODO: opportunity to camelCase here?
	// TODO: maybe we need to give the user the power to take over here?
	return row.reduce( ( acc, col, i ) => {
		acc[ col.metadata.colName || i ] = col.value;
		return acc;
	}, {} );
};
