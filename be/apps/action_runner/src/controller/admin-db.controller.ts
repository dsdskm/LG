import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { ok } from "@ai-log/shared-contracts";
import { AdminDbService } from "../service/admin-db.service";

/**
 * 관리용 액션 import (로컬 → 클라우드 푸시). 프로토타입: 인증 없음.
 * Method/Path: POST /admin/db/import
 * Body: { "actions": [{ "key": "...", "name": "..." }] }
 */
@ApiExcludeController()
@Controller("admin/db")
export class AdminDbController {
  constructor(private readonly adminDbService: AdminDbService) {}

  @Post("import")
  @HttpCode(200)
  async import(@Body() body: { actions?: unknown[] }) {
    const result = await this.adminDbService.importActions(body?.actions ?? []);
    return ok(result);
  }
}
