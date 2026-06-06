import { ApiProperty } from '@nestjs/swagger';
import { SearchType } from 'src/util/types';

export class SearchGeneratorDto {
  @ApiProperty()
  attributeName: string;

  @ApiProperty()
  searchQuery: string;

  @ApiProperty({
    description: 'The type of search',
    enum: SearchType,
  })
  searchType: SearchType;
}
