import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortField {
  ORIGINAL_NAME = 'originalName',
  SIZE = 'size',
  CREATED_AT = 'createdAt',
  MIME_TYPE = 'mimeType',
  IS_PRIVATE = 'isPrivate',
}

export class FilterDocumentsDto {
  @ApiProperty({
    description: 'Фильтр по имени документа',
    required: false,
    example: 'document',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Фильтр по типу файла (MIME type)',
    required: false,
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    description: 'Фильтр по приватности файла',
    required: false,
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({
    description: 'Минимальный размер файла в байтах',
    required: false,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSize?: number;

  @ApiProperty({
    description: 'Максимальный размер файла в байтах',
    required: false,
    example: 10485760,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxSize?: number;

  @ApiProperty({
    description: 'Поле для сортировки',
    required: false,
    enum: SortField,
    example: SortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.CREATED_AT;

  @ApiProperty({
    description: 'Порядок сортировки',
    required: false,
    enum: SortOrder,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiProperty({
    description: 'Показывать только мои документы',
    required: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value, obj }) => {
    const rawValue = obj?.onlyMine ?? value;

    if (rawValue === undefined || rawValue === null) return undefined;

    if (typeof rawValue === 'string') {
      const lower = rawValue.toLowerCase().trim();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0' || lower === '') return false;
    }

    if (rawValue === true || rawValue === 1) return true;
    if (rawValue === false || rawValue === 0) return false;

    return undefined;
  })
  @IsBoolean()
  onlyMine?: boolean;

  @ApiProperty({
    description: 'Номер страницы',
    required: false,
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Количество документов на странице',
    required: false,
    default: 30,
    minimum: 1,
    maximum: 300,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  limit?: number = 30;
}
