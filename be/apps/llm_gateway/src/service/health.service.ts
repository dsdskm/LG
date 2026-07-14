import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  check(): { ok: true } {
    this.logger.log("[llm_gateway] health check");
    return { ok: true };
  }
}
