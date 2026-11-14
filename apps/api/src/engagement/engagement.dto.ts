import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
export class CreatePollDto {
  @IsString() @MinLength(1) @MaxLength(500) question!: string;
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options!: string[];
  @IsBoolean() multiple!: boolean;
}
export class VotePollDto {
  @IsArray() @ArrayMaxSize(20) @IsUUID('4', { each: true }) optionIds!: string[];
}
export class QuestionDto {
  @IsString() @MinLength(1) @MaxLength(1000) content!: string;
}
