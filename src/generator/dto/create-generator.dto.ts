import { ApiProperty } from '@nestjs/swagger';

export class CreateGeneratorDto {
  @ApiProperty()
  code: string;

  [key: string]: any;
}
