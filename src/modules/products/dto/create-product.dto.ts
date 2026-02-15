import { IsString, IsNumber, IsUUID, Min, IsOptional } from "class-validator";

export class CreateProductDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?:string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @Min(0)
    stock: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsUUID()
    categoryId: string;
}