import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import type { User } from "./User";

@Entity("videos")
@Index(["category"])
@Index(["createdAt"])
@Index(["authorId"])
export class Video {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, nullable: true })
  bunnyVideoId?: string; // Video ID registered in Bunny.net Stream or local ID

  @Column()
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column()
  thumbnailUrl!: string;

  @Column()
  videoUrl!: string; // CDN HLS streaming play URL or MP4 URL

  @Column({ type: "int" })
  duration!: number; // in seconds

  @Column({ type: "int", default: 0 })
  views!: number;

  @Column()
  category!: string;

  @Column("simple-array")
  tags!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne("User", (user: User) => user.videos, { onDelete: "CASCADE" })
  @JoinColumn({ name: "authorId" })
  author!: User;

  @Column()
  authorId!: string;
}


