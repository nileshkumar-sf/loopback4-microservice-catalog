import {model, property} from '@loopback/repository';
import {UserModifiableEntity} from '@sourceloop/core';

@model({settings: {strict: false}})
export class AttachmentFileDto extends UserModifiableEntity {
  @property({
    type: 'array',
    itemType: 'any',
    required: true,
  })
  attachmentFiles: any[]; //NOSONAR

  [prop: string]: any; //NOSONAR

  constructor(data?: Partial<AttachmentFileDto>) {
    super(data);
  }
}
