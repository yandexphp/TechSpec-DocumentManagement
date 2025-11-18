import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateDocumentDto {
  @ApiProperty({
    description: 'Приватность документа',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
