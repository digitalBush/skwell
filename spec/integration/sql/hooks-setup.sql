DROP TABLE IF EXISTS dbo.HooksTest;
CREATE TABLE dbo.HooksTest(
	[order] int identity,
	[who] nvarchar(20),
	[context] nvarchar(20)
);
