import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMimeType, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UploadChunkDto {
  @ApiProperty({
    description: 'ID файла для загрузки по частям',
    example: '1763267226309-0-f5w19g',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileId: string;

  @ApiProperty({
    description: 'Индекс chunk (начиная с 0)',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  chunkIndex: number;

  @ApiProperty({
    description: 'Общее количество chunks',
    example: 10,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  totalChunks: number;

  @ApiProperty({
    description: 'Имя файла',
    example: 'document.pdf',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    description: 'MIME тип файла',
    example: 'application/pdf',
  })
  @IsMimeType()
  mimeType: string;
}
