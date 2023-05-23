import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true })
  twitchUserId: number;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  registeredAt: Date;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  profileImageUrl: string;

  @Prop({ required: true })
  twitchAccessToken: string;

  @Prop({ required: true })
  twitchRefreshToken: string;

  @Prop({ required: true })
  serviceRefreshToken: string[];

  @Prop()
  profileBackgroundUrl: string;

  @Prop()
  follow: Date;

  @Prop()
  subscription: number;

  @Prop({ required: true })
  userType: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
