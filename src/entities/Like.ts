import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import type { User } from "./User";
import type { Video } from "./Video";

@Entity("likes")
@Index(["videoId", "isLike"])
@Index(["userId", "videoId"])
export class Like {
  @PrimaryColumn("uuid")
  userId!: string;

  @PrimaryColumn("uuid")
  videoId!: string;

  @Column({ type: "boolean" })
  isLike!: boolean; // true for like, false for dislike

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @ManyToOne("Video", { onDelete: "CASCADE" })
  @JoinColumn({ name: "videoId" })
  video!: Video;
}

