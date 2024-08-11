const sequelize = require("../../config/connection");

const iconUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: "No file uploades" });
  }

  res.status(200).json({
    fileName: req.file.filename,
  });
};

const mediaUpload = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send({ error: "No files uploaded" });
  }

  const fileNames = req.files.map((file) => file.filename);

  res.status(200).json({
    fileNames: fileNames,
  });
};

module.exports = {
  iconUpload,
  mediaUpload,
};
