import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClipDocument = HydratedDocument<Clip>;

@Schema()
export class Clip {
  @Prop({ required: true })
  contentId: string;

  @Prop({ required: true })
  contentName: string;

  @Prop({ required: true })
  gameId: number;

  @Prop({ required: true })
  gameName: string;

  @Prop({ required: true })
  streamStartedAt: Date;

  @Prop({ required: true })
  creatorId: number;

  @Prop({ required: true })
  creatorName: string;

  @Prop({ required: true })
  clipCreatedAt: Date;

  @Prop({ required: true })
  clipDuration: number;

  @Prop({ required: true })
  clipLastEdited: Date;

  @Prop({ required: true })
  clipName: string;
}

export const ClipSchema = SchemaFactory.createForClass(Clip);
