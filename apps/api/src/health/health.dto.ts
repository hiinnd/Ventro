import { ApiProperty } from '@nestjs/swagger';
class DependencyChecksDto {
  @ApiProperty({ enum: ['up', 'down'] }) database!: 'up' | 'down';
  @ApiProperty({ enum: ['up', 'down'] }) redis!: 'up' | 'down';
}
export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] }) status!: 'ok' | 'degraded';
  @ApiProperty({ example: 'ventro-api' }) service!: string;
  @ApiProperty({ format: 'date-time' }) timestamp!: string;
  @ApiProperty({ type: DependencyChecksDto }) checks!: DependencyChecksDto;
}
