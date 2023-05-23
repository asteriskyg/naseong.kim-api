import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContentDocument = HydratedDocument<Content>;

@Schema()
export class Content {
  @Prop({ required: true })
  contentId: string;

  @Prop({ required: true })
  contentName: string;

  @Prop({ required: true })
  creatorName: string;
}

export const ContentSchema = SchemaFactory.createForClass(Content);
