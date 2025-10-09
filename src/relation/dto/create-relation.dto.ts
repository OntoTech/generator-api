import { ApiProperty } from '@nestjs/swagger';

export class CreateRelationDto {
  @ApiProperty()
  fromId: string;

  @ApiProperty()
  toId: string;

  @ApiProperty()
  baseType: string;

  @ApiProperty()
  objectType: string;

  @ApiProperty()
  relationType: string;

  @ApiProperty()
  relatedBaseType: string;

  @ApiProperty()
  relatedObjectType: string;
}
