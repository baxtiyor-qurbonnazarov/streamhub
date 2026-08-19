import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import type { User } from "./User";
import type { Video } from "./Video";

@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  text!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne("Video", { onDelete: "CASCADE" })
  @JoinColumn({ name: "videoId" })
  video!: Video;

  @Column()
  videoId!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "authorId" })
  author!: User;

  @Column()
  authorId!: string;

  @ManyToOne("Comment", (comment: Comment) => comment.replies, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "parentId" })
  parent?: Comment | null;

  @Column({ nullable: true })
  parentId?: string | null;

  @OneToMany("Comment", (comment: Comment) => comment.parent)
  replies?: Comment[];

  @ManyToOne("User", { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "replyToUserId" })
  replyToUser?: User | null;

  @Column({ nullable: true })
  replyToUserId?: string | null;
}


