"use strict";

const fs = require("fs");
const path = require("path");
const {
  skrollsSequelize,
  repositorySequelize,
} = require("../config/connection");
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const db = {};

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      file === "user.js" ? repositorySequelize : skrollsSequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.skrollsSequelize = skrollsSequelize;
db.repositorySequelize = repositorySequelize;
db.Sequelize = Sequelize;

module.exports = db;
