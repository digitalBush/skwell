DROP TABLE IF EXISTS dbo.ChildTests;
DROP TABLE IF EXISTS dbo.ParentTests;
CREATE TABLE dbo.ParentTests(
	id int not null primary key
);

CREATE TABLE dbo.ChildTests (
	id int not null references dbo.ParentTests(id)
);
