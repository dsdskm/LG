import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

/**
 * 관리용 DB import : 로컬에서 보낸 pg_dump(--inserts) SQL 로 이 서비스의 DB 를 초기화한다.
 * - 프로토타입: 인증 없음.
 * - 적재 전 public 스키마 전체 TRUNCATE → INSERT 적재 → 시퀀스 보정 (단일 트랜잭션).
 * - FK 순서 문제는 session_replication_role=replica 로 우회.
 */
@Injectable()
export class AdminDbService {
  private readonly logger = new Logger(AdminDbService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async importSql(sql: string): Promise<{ ok: true; truncatedTables: number }> {
    const body = String(sql ?? "").trim();
    if (!body) {
      throw new BadRequestException("sql 본문이 비어 있습니다.");
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      await qr.startTransaction();
      await qr.query("SET session_replication_role = 'replica'");

      const tables: Array<{ tablename: string }> = await qr.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
      );
      for (const { tablename } of tables) {
        await qr.query(
          `TRUNCATE TABLE public."${tablename}" RESTART IDENTITY CASCADE`,
        );
      }

      // 로컬에서 보낸 INSERT 문 일괄 실행 (multi-statement)
      await qr.query(body);

      // 명시적 id 적재 후 serial 충돌 방지
      await qr.query(`
        DO $$
        DECLARE r RECORD;
        BEGIN
          FOR r IN
            SELECT s.relname AS seq, t.relname AS tbl, a.attname AS col
            FROM pg_class s
            JOIN pg_depend d ON d.objid = s.oid AND d.deptype = 'a'
            JOIN pg_class t ON t.oid = d.refobjid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
            WHERE s.relkind = 'S'
          LOOP
            EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM public.%I), 0) + 1, false)',
                           r.seq, r.col, r.tbl);
          END LOOP;
        END $$;
      `);

      await qr.query("SET session_replication_role = 'origin'");
      await qr.commitTransaction();
      this.logger.log(
        `[admin] DB import 완료: truncated=${tables.length} tables`,
      );
      return { ok: true, truncatedTables: tables.length };
    } catch (e: any) {
      await qr.rollbackTransaction().catch(() => undefined);
      this.logger.error(`[admin] DB import 실패: ${e?.message ?? String(e)}`);
      throw new BadRequestException(
        `DB import 실패: ${e?.message ?? String(e)}`,
      );
    } finally {
      await qr.release();
    }
  }
}
