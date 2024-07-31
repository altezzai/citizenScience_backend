const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "video/mp4"];
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error("Incorrect file type");
    error.code = "INCORRECT_FILETYPE";
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 50 },
  fileFilter: fileFilter,
});

module.exports = upload;
