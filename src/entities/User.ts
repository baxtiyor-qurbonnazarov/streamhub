import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import type { Video } from "./Video";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  phoneNumber!: string;

  @Column()
  password?: string; // Hashed password, made optional for JSON serialization safety

  @Column()
  name!: string;

  @Column({ unique: true })
  handle!: string; // e.g. @john_doe

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: "text", nullable: true })
  bio?: string;

  @Column({ default: false })
  isVerified!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany("Video", (video: Video) => video.author)
  videos!: Video[];
}

