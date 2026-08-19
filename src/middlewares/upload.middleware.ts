import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directories exist
const uploadBaseDir = path.resolve(process.cwd(), "uploads");
const avatarsDir = path.resolve(uploadBaseDir, "avatars");
const thumbnailsDir = path.resolve(uploadBaseDir, "thumbnails");

if (!fs.existsSync(uploadBaseDir)) {
  fs.mkdirSync(uploadBaseDir, { recursive: true });
}
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Multer storage settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "avatar") {
      cb(null, avatarsDir);
    } else if (file.fieldname === "thumbnail") {
      cb(null, thumbnailsDir);
    } else {
      cb(null, uploadBaseDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter (images only)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = /^\.(jpe?g|png|webp|gif|heic|heif)$/i;
  const ext = path.extname(file.originalname || "").toLowerCase();
  const isImageMime = file.mimetype.startsWith("image/") || file.mimetype === "application/octet-stream";
  const isAllowedExt = ext === "" || allowedExtensions.test(ext);

  if (isImageMime || isAllowedExt) {
    return cb(null, true);
  }

  console.error(`[Upload error] Rejected file - Name: ${file.originalname}, Mimetype: ${file.mimetype}`);
  cb(new Error("Faqat rasm fayllari ruxsat etiladi! (.jpg, .jpeg, .png, .webp, .gif, .heic, .heif)"));
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max size
  },
  fileFilter: fileFilter,
});
