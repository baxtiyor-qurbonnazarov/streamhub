import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Subscription } from "../entities/Subscription";
import { AppError } from "../middlewares/errorHandler";
import { encryptText, decryptText, decryptUser } from "../utils/crypto.util";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

export class UserService {
  private get userRepository() { return AppDataSource.getRepository(User); }
  private get subscriptionRepository() { return AppDataSource.getRepository(Subscription); }

  private generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET || "supersecretkeyformvp_streamhub_2026";
    return jwt.sign({ userId }, secret, { expiresIn: "30d" });
  }

  async register(phoneNumber: string, name: string, handle: string, password?: string): Promise<{ token: string; user: Omit<User, "password"> }> {
    const allUsers = await this.userRepository.find();
    
    // Check if phone number already exists
    const existingPhone = allUsers.find(u => decryptText(u.phoneNumber) === phoneNumber.trim());
    if (existingPhone) {
      throw new AppError("Ushbu telefon raqami allaqachon ro'yxatdan o'tgan.", 400);
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
    let hashedPassword = "";
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      throw new AppError("Parol kiritilishi shart.", 400);
    }

    // Create user with AES-256 encrypted fields for database zero-knowledge storage
    const newUser = this.userRepository.create({
      phoneNumber: encryptText(phoneNumber.trim()),
      name: encryptText(name.trim()),
      handle: encryptText(formattedHandle),
      password: hashedPassword,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=7C3AED&color=ffffff&size=200`,
      bio: encryptText("StreamHub-da yangi ijodkor!"),
      isVerified: false,
    });


    const savedUser = await this.userRepository.save(newUser);
    const token = this.generateToken(savedUser.id);
    return { token, user: decryptUser(savedUser) };
  }

  async login(phoneNumber: string, password?: string): Promise<{ token: string; user: Omit<User, "password"> }> {
    if (!password) {
      throw new AppError("Parol kiritilishi shart.", 400);
    }

    const allUsers = await this.userRepository.find();
    const user = allUsers.find(u => decryptText(u.phoneNumber) === phoneNumber.trim());

    if (!user) {
      throw new AppError("Telefon raqami yoki parol noto'g'ri.", 400);
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      throw new AppError("Telefon raqami yoki parol noto'g'ri.", 400);
    }

    const token = this.generateToken(user.id);
    return { token, user: decryptUser(user) };
  }

  async getProfile(userId: string, targetUserId: string): Promise<any> {
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new AppError("Foydalanuvchi topilmadi.", 404);
    }

    // Get subscriber count
    const subscribersCount = await this.subscriptionRepository.count({
      where: { followingId: targetUserId },
    });

    // Check if current user is following the target user
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
  ): Promise<Omit<User, "password">> {
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

  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.password) {
      throw new AppError("Foydalanuvchi topilmadi.", 404);
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

  async getMe(userId: string): Promise<Omit<User, "password">> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError("Tizimga kirilmagan yoki foydalanuvchi mavjud emas.", 404);
    }
    return decryptUser(user);
  }
}
export const userService = new UserService();

