import { IsOptional, IsUUID, IsNumberString, IsString } from 'class-validator';

export class QueryProductsDto {
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsNumberString()
    page?: string;

    @IsOptional()
    @IsNumberString()
    limit?: string;
}