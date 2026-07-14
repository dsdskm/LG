/** 헬스체크 서비스. */
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  check(): { ok: true } {
    this.logger.log("[ai_chat_service] health check");
    return { ok: true };
  }
}
