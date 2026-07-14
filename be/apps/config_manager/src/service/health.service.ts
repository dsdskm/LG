import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  check(): { ok: true; service: string } {
    this.logger.log("[config_manager] health check");
    return { ok: true, service: "config_manager" };
  }
}