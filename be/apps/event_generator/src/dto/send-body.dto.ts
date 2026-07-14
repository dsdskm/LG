import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendBody {
  @ApiPropertyOptional({
    description: '테스트 로그 생성 시간(분)',
    example: 1,
  })
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: '초당 생성할 로그 개수',
    example: 30,
  })
  logsPerSecond?: number;

  @ApiPropertyOptional({
    description: '에러 템플릿 문자열 또는 문자열 배열',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: ['timeout error', 'db connection lost'],
  })
  errorTemplates?: string[] | string;

  @ApiPropertyOptional({
    description: '강제로 삽입할 에러 로그 개수',
    example: 3,
  })
  errorCount?: number;

  @ApiPropertyOptional({
    description: '자동 생성할 로봇 ID 개수',
    example: 5,
  })
  robotIdCount?: number;

  @ApiPropertyOptional({
    description: '로봇 ID 문자열 또는 문자열 배열',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: ['RBT-001', 'RBT-002'],
  })
  robotIds?: string[] | string;

  @ApiPropertyOptional({
    description: '이벤트 수신 서비스 URL 오버라이드',
    example: 'http://localhost:3001/events/ingest/mcap',
  })
  receiverUrl?: string;
}
