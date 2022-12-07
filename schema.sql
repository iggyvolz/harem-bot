DROP TABLE IF EXISTS harems;
DROP TABLE IF EXISTS guilds;
CREATE TABLE harems (guild TEXT, name TEXT, role TEXT, channel TEXT, PRIMARY KEY (`guild`, `name`));
CREATE TABLE guilds (guild TEXT, parent TEXT, PRIMARY KEY (`guild`));