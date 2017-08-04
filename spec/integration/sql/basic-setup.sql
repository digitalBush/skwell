DROP TABLE IF EXISTS dbo.QueryTests;
CREATE TABLE dbo.QueryTests(
	id int,
	test nvarchar(100)
);

INSERT INTO QueryTests values (1,'A'), (2,'B'), (3,'C');

DROP TABLE IF EXISTS dbo.MutationTests;
CREATE TABLE dbo.MutationTests(
	id int,
	test nvarchar(100)
);

