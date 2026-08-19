import crypto from "crypto";

// AES-256-CBC Encryption configuration
const ALGORITHM = "aes-256-cbc";
// 32-byte secret key for AES-256
const SECRET_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || "streamhub_aes_secret_key_2026_32b_fixed",
  "utf-8"
).subarray(0, 32);

// Initialization Vector length
const IV_LENGTH = 16;

/**
 * Encrypts cleartext string to AES-256 ciphertext with 'ENC:' prefix.
 */
export function encryptText(text: string | null | undefined): string {
  if (!text) return "";
  if (text.startsWith("ENC:")) return text; // Already encrypted

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `ENC:${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return text;
  }
}

/**
 * Decrypts 'ENC:' ciphertext string back to plain cleartext.
 */
export function decryptText(cipherText: string | null | undefined): string {
  if (!cipherText) return "";
  if (!cipherText.startsWith("ENC:")) return cipherText; // Plain text or unencrypted

  try {
    const parts = cipherText.substring(4).split(":");
    if (parts.length !== 2) return cipherText;

    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return cipherText;
  }
}

/**
 * Deterministic hash for database lookup (e.g. searching encrypted phone numbers or handles)
 */
export function hashLookup(value: string): string {
  if (!value) return "";
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Decrypts a User entity/object fields before sending to the client.
 */
export function decryptUser(user: any): any {
  if (!user) return user;
  const { password, ...userWithoutPassword } = user;
  return {
    ...userWithoutPassword,
    phoneNumber: decryptText(user.phoneNumber),
    name: decryptText(user.name),
    handle: decryptText(user.handle),
    bio: decryptText(user.bio),
  };
}

/**
 * Decrypts a Video entity/object fields (including author if populated) before sending to client.
 */
export function decryptVideo(video: any): any {
  if (!video) return video;
  return {
    ...video,
    title: decryptText(video.title),
    description: decryptText(video.description),
    author: video.author ? decryptUser(video.author) : undefined,
  };
}

/**
 * Decrypts a Comment entity/object fields (including author and replies) before sending to client.
 */
export function decryptComment(comment: any): any {
  if (!comment) return comment;
  return {
    ...comment,
    text: decryptText(comment.text),
    author: comment.author ? decryptUser(comment.author) : undefined,
    replies: comment.replies ? comment.replies.map(decryptComment) : undefined,
  };
}
