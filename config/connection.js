const { Sequelize } = require("sequelize");
const config = require("./config.json");

const environment = process.env.NODE_ENV || "development";
const skrollsConfig = config[environment];
const repositoryConfig = config["repository"];

const skrollsSequelize = new Sequelize(
  skrollsConfig.database,
  skrollsConfig.username,
  skrollsConfig.password,
  {
    host: skrollsConfig.host,
    dialect: skrollsConfig.dialect,
  }
);

const repositorySequelize = new Sequelize(
  repositoryConfig.database,
  repositoryConfig.username,
  repositoryConfig.password,
  {
    host: repositoryConfig.host,
    dialect: repositoryConfig.dialect,
  }
);

module.exports = { skrollsSequelize, repositorySequelize };
