import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Subscription } from "../entities/Subscription";
import { AppError } from "../middlewares/errorHandler";
import { encryptText, decryptText, decryptUser } from "../utils/crypto.util";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import crypto from "crypto";

export class UserService {
  private get userRepository() { return AppDataSource.getRepository(User); }
  private get subscriptionRepository() { return AppDataSource.getRepository(Subscription); }

  private generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET || "supersecretkeyformvp_streamhub_2026";
    return jwt.sign({ userId }, secret, { expiresIn: "30d" });
  }

  /// Registration with Email, Password, Name, and Username (@handle)
  async register(
    email: string,
    name: string,
    handle: string,
    password?: string,
    phoneNumber?: string
  ): Promise<{ token: string; user: any }> {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new AppError("Yaroqli email manzilini kiriting.", 400);
    }

    if (!password || password.length < 6) {
      throw new AppError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.", 400);
    }

    const allUsers = await this.userRepository.find();

    // Check if email already exists
    const existingEmail = allUsers.find(u => decryptText(u.email).toLowerCase() === cleanEmail);
    if (existingEmail) {
      throw new AppError("Ushbu email manzili allaqachon ro'yxatdan o'tgan. Tizimga kiring.", 400);
    }

    // Format handle
    let formattedHandle = handle.trim();
    if (!formattedHandle.startsWith("@")) {
      formattedHandle = `@${formattedHandle}`;
    }

    // Check if handle already exists
    const existingHandle = allUsers.find(u => decryptText(u.handle).toLowerCase() === formattedHandle.toLowerCase());
    if (existingHandle) {
      throw new AppError("Ushbu foydalanuvchi nomi (@handle) allaqachon band qilingan.", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with AES-256 encrypted sensitive fields
    const newUser = this.userRepository.create({
      email: encryptText(cleanEmail),
      phoneNumber: phoneNumber ? encryptText(phoneNumber.trim()) : undefined,
      name: encryptText(name.trim()),
      handle: encryptText(formattedHandle),
      password: hashedPassword,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=7C3AED&color=ffffff&size=200`,
      bio: encryptText("StreamHub-da yangi ijodkor!"),
      isVerified: false,
      isGoogleConnected: false,
    });

    const savedUser = await this.userRepository.save(newUser);
    const token = this.generateToken(savedUser.id);
    return { token, user: decryptUser(savedUser) };
  }

  /// Login via Email / Username / Phone + Password
  async login(identifier: string, password?: string): Promise<{ token: string; user: any }> {
    if (!identifier || !identifier.trim()) {
      throw new AppError("Email yoki foydalanuvchi nomini kiriting.", 400);
    }

    if (!password) {
      throw new AppError("Parolni kiriting.", 400);
    }

    const cleanId = identifier.trim().toLowerCase();
    const allUsers = await this.userRepository.find();

    const user = allUsers.find(u => {
      const email = decryptText(u.email).toLowerCase();
      const handle = decryptText(u.handle).toLowerCase();
      const phone = decryptText(u.phoneNumber).toLowerCase();
      return email === cleanId || handle === cleanId || `@${handle}` === cleanId || phone === cleanId;
    });

    if (!user) {
      throw new AppError("Kiritilgan email yoki parol noto'g'ri.", 400);
    }

    // Google-only account check
    if (!user.password) {
      throw new AppError(
        "Ushbu hisob faqat Google orqali ochilgan. Google orqali kiring yoki profilingizda parol o'rnating.",
        400
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError("Kiritilgan email yoki parol noto'g'ri.", 400);
    }

    const token = this.generateToken(user.id);
    return { token, user: decryptUser(user) };
  }

  /// Google OAuth Registration & Login (WITHOUT FIREBASE)
  /// Performs Account Linking automatically if email matches existing account!
  async googleAuth(params: {
    idToken?: string;
    accessToken?: string;
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<{ token: string; user: any }> {
    const cleanEmail = (params.email || "").trim().toLowerCase();
    if (!cleanEmail) {
      throw new AppError("Google akkauntidan email ma'lumoti olinmadi.", 400);
    }

    const allUsers = await this.userRepository.find();

    // 1. Check if user with matching googleId OR matching email exists
    let existingUser = allUsers.find(u => 
      u.googleId === params.googleId || decryptText(u.email).toLowerCase() === cleanEmail
    );

    if (existingUser) {
      // ── ACCOUNT LINKING LOGIC ──
      // Link Google ID to existing email account if not already linked
      existingUser.googleId = params.googleId;
      existingUser.isGoogleConnected = true;
      if (params.avatarUrl && (!existingUser.avatarUrl || existingUser.avatarUrl.includes('ui-avatars'))) {
        existingUser.avatarUrl = params.avatarUrl;
      }

      const savedUser = await this.userRepository.save(existingUser);
      const token = this.generateToken(savedUser.id);
      return { token, user: decryptUser(savedUser) };
    }

    // 2. Create NEW User for Google account
    // Generate initial unique handle from email prefix
    let baseHandle = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
    if (!baseHandle) baseHandle = "user";
    let formattedHandle = `@${baseHandle}`;
    
    let counter = 1;
    while (allUsers.some(u => decryptText(u.handle).toLowerCase() === formattedHandle.toLowerCase())) {
      formattedHandle = `@${baseHandle}${counter}`;
      counter++;
    }

    const newUser = this.userRepository.create({
      email: encryptText(cleanEmail),
      name: encryptText(params.name || "Google User"),
      handle: encryptText(formattedHandle),
      avatarUrl: params.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(params.name)}&background=7C3AED&color=ffffff&size=200`,
      googleId: params.googleId,
      isGoogleConnected: true,
      password: undefined, // Password is OPTIONAL for Google users!
      bio: encryptText("Google orqali ro'yxatdan o'tgan ijodkor!"),
      isVerified: false,
    });

    const savedUser = await this.userRepository.save(newUser);
    const token = this.generateToken(savedUser.id);
    return { token, user: decryptUser(savedUser) };
  }

  /// Sets a new password for a Google user (or user without password)
  async setPassword(userId: string, newPass: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError("Foydalanuvchi topilmadi.", 404);
    }

    if (newPass.length < 6) {
      throw new AppError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.", 400);
    }

    user.password = await bcrypt.hash(newPass, 10);
    const savedUser = await this.userRepository.save(user);
    return decryptUser(savedUser);
  }

  /// Changes existing password
  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError("Foydalanuvchi topilmadi.", 404);
    }

    if (!user.password) {
      throw new AppError("Sizda hali parol o'rnatilmagan. Parol o'rnatish bo'limidan foydalaning.", 400);
    }

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      throw new AppError("Joriy parol noto'g'ri.", 400);
    }

    if (newPass.length < 6) {
      throw new AppError("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.", 400);
    }

    user.password = await bcrypt.hash(newPass, 10);
    await this.userRepository.save(user);
  }

  /// Forgot password initiation
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const allUsers = await this.userRepository.find();
    const user = allUsers.find(u => decryptText(u.email).toLowerCase() === cleanEmail);

    if (!user) {
      // Security best practice: respond with general success message
      return { message: "Agar ushbu email tizimda mavjud bo'lsa, tiklash ko'rsatmalari yuborildi." };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
    await this.userRepository.save(user);

    return {
      message: "Parolni tiklash kaliti yaratildi.",
      resetToken,
    };
  }

  /// Reset password using token
  async resetPassword(token: string, newPass: string): Promise<void> {
    if (newPass.length < 6) {
      throw new AppError("Parol kamida 6 ta belgidan iborat bo'lishi kerak.", 400);
    }

    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new AppError("Parol tiklash havolasi yaroqsiz yoki muddati o'tgan.", 400);
    }

    user.password = await bcrypt.hash(newPass, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await this.userRepository.save(user);
  }

  async getProfile(userId: string, targetUserId: string): Promise<any> {
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new AppError("Foydalanuvchi topilmadi.", 404);
    }

    const subscribersCount = await this.subscriptionRepository.count({
      where: { followingId: targetUserId },
    });

    const isFollowed = await this.subscriptionRepository.findOne({
      where: { followerId: userId, followingId: targetUserId },
    });

    const decryptedProfile = decryptUser(targetUser);

    return {
      ...decryptedProfile,
      subscribersCount,
      isFollowed: !!isFollowed,
    };
  }

  async toggleFollow(followerId: string, followingId: string): Promise<{ isFollowed: boolean; subscribersCount: number }> {
    if (followerId === followingId) {
      throw new AppError("O'zingizga ergasha olmaysiz.", 400);
    }

    const targetUser = await this.userRepository.findOne({ where: { id: followingId } });
    if (!targetUser) {
      throw new AppError("Ijodkor topilmadi.", 404);
    }

    const existingFollow = await this.subscriptionRepository.findOne({
      where: { followerId, followingId },
    });

    if (existingFollow) {
      await this.subscriptionRepository.delete({ followerId, followingId });
    } else {
      const follow = this.subscriptionRepository.create({ followerId, followingId });
      await this.subscriptionRepository.save(follow);
    }

    const subscribersCount = await this.subscriptionRepository.count({
      where: { followingId },
    });

    return {
      isFollowed: !existingFollow,
      subscribersCount,
    };
  }

  async updateProfile(
    userId: string,
    updates: { name?: string; handle?: string; bio?: string; avatarUrl?: string }
  ): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError("Foydalanuvchi topilmadi.", 404);
    }

    if (updates.name !== undefined) {
      user.name = encryptText(updates.name.trim());
    }

    if (updates.handle !== undefined) {
      let formattedHandle = updates.handle.trim();
      if (!formattedHandle.startsWith("@")) {
        formattedHandle = `@${formattedHandle}`;
      }

      // Check handle uniqueness
      const allUsers = await this.userRepository.find();
      const existingHandle = allUsers.find(
        u => u.id !== userId && decryptText(u.handle).toLowerCase() === formattedHandle.toLowerCase()
      );
      if (existingHandle) {
        throw new AppError("Ushbu foydalanuvchi nomi (@handle) allaqachon band qilingan.", 400);
      }

      user.handle = encryptText(formattedHandle);
    }

    if (updates.bio !== undefined) {
      user.bio = encryptText(updates.bio.trim());
    }

    if (updates.avatarUrl !== undefined) {
      user.avatarUrl = updates.avatarUrl.trim();
    }

    const savedUser = await this.userRepository.save(user);
    return decryptUser(savedUser);
  }

  async getMe(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError("Tizimga kirilmagan yoki foydalanuvchi mavjud emas.", 404);
    }
    return decryptUser(user);
  }
}

export const userService = new UserService();
