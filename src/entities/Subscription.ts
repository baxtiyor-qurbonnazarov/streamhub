import { Entity, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from "typeorm";
import type { User } from "./User";

@Entity("subscriptions")
@Index(["followingId"])
@Index(["followerId", "followingId"])
export class Subscription {
  @PrimaryColumn("uuid")
  followerId!: string; // The user who follows

  @PrimaryColumn("uuid")
  followingId!: string; // The creator being followed

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "followerId" })
  follower!: User;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "followingId" })
  following!: User;
}

