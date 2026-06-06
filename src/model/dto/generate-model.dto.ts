import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateModelDto {
  @ApiProperty()
  sampleObject: Record<string, any>;

  @ApiPropertyOptional()
  modelCode?: string;

  @ApiPropertyOptional()
  modelName?: string;

  @ApiPropertyOptional()
  modelDescription?: string;

  @ApiPropertyOptional()
  domain?: string;

  @ApiPropertyOptional()
  baseTypePrefix?: string;
}
