import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import type { Video } from "./Video";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ unique: true, nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  password?: string; // Hashed password, optional for Google-only users

  @Column()
  name!: string;

  @Column({ unique: true })
  handle!: string; // e.g. @john_doe

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @Column({ unique: true, nullable: true })
  googleId?: string;

  @Column({ default: false })
  isGoogleConnected!: boolean;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ nullable: true })
  resetPasswordToken?: string;

  @Column({ type: "timestamp", nullable: true })
  resetPasswordExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany("Video", (video: Video) => video.author)
  videos!: Video[];
}
