import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateErrorContextLinesDto {
  @ApiPropertyOptional({
    description: "에러 주변 컨텍스트 라인 수",
    example: 7,
  })
  errorContextLines?: number;

  @ApiPropertyOptional({
    description: "갱신 사용자",
    example: "ops",
  })
  updatedBy?: string;
}