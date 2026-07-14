import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { ok } from "@ai-log/shared-contracts";
import { AdminDbService } from "../service/admin-db.service";

/**
 * 관리용 DB import (로컬 → 클라우드 푸시). 프로토타입: 인증 없음.
 * Method/Path: POST /admin/db/import
 * Body: { "sql": "<pg_dump --data-only --inserts 결과>" }
 */
@ApiExcludeController()
@Controller("admin/db")
export class AdminDbController {
  constructor(private readonly adminDbService: AdminDbService) {}

  @Post("import")
  @HttpCode(200)
  async import(@Body() body: { sql?: string }) {
    const result = await this.adminDbService.importSql(body?.sql ?? "");
    return ok(result);
  }
}
