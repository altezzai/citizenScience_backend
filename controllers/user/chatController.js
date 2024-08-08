const sequelize = require("../../config/connection");

const fileUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: "No file uploades" });
  }

  res.status(200).json({
    fileName: req.file.filename,
  });
};

module.exports = {
  fileUpload,
};
