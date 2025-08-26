import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ModelPropsDto {
  @ApiProperty()
  domain: string;
}

class ModelItemPropsDto {
  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  type?: string;
}

class ModelItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  props: ModelItemPropsDto;
}

class ModelRelationPropsDto {
  @ApiPropertyOptional()
  isRequired?: boolean;
}

class ModelRelationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;

  @ApiProperty()
  props: ModelRelationPropsDto;
}

export class CreateModelDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  props: ModelPropsDto;

  @ApiProperty()
  items: ModelItemDto[];

  @ApiProperty()
  relations: ModelRelationDto[];
}
