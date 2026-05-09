import { Injectable, Logger } from '@nestjs/common';
import type { ReportSummaryRequest } from '@ai-log/shared-contracts';
import { ReceiverApi } from 'src/api/receiver.api';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);

  /**
   * ✅ URL 우선순위
   * 1) OLLAMA_URL (compose 권장)
   * 2) URL_OLLAMA_CONTAINER / URL_OLLAMA (기존 호환)
   * 3) RUN_IN_DOCKER 여부에 따른 기본값
   */
  private readonly baseUrl =
    process.env.OLLAMA_URL ??
    (process.env.RUN_IN_DOCKER === 'true'
      ? (process.env.URL_OLLAMA_CONTAINER ?? 'http://ollama:11434')
      : (process.env.URL_OLLAMA ?? 'http://127.0.0.1:11434'));

  /**
   * ✅ 기본 모델: phi3 (env로 덮어쓰기 가능)
   */
  private readonly model = process.env.OLLAMA_MODEL ?? 'phi3';

  /**
   * ✅ timeout 기본 120초 (LLM은 10초 너무 짧음)
   */
  private readonly timeoutMs = Number(process.env.SERVER_TIMEOUT ?? 300_000);

  /**
   * ✅ Ollama 호출 동시성 제한(1개씩 직렬화)
   * - curl은 1번만 치지만, 코드는 동시 호출이 발생하기 쉬워서 안정화에 도움 됨
   */
  private queue: Promise<void> = Promise.resolve();

  // ⚠️ ReceiverApi가 실제로 필요 없으면 제거하는 게 깔끔합니다.
  constructor(private readonly receiverApi: ReceiverApi) {}

  async summarizeReport(req: ReportSummaryRequest): Promise<string> {
    return this.runExclusive(() => this.summarizeReportWithOllama(req));
  }

  private async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => (release = resolve));

    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private async summarizeReportWithOllama(req: ReportSummaryRequest): Promise<string> {
    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const prompt = this.buildPromptSafe(req);
    // const prompt = "hello"
    const url = `${this.baseUrl}/api/generate`;
    this.logger.log(`prompt ${prompt}`)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startTime = Date.now();

    try {
      const bodyObj = {
        model: this.model,
        prompt,
        stream: false,
      };
      const body = JSON.stringify(bodyObj);

      // ⚠️ body 전체를 로그로 찍지 말고 길이만 (로그 폭발/지연 방지)
      this.logger.debug?.(`[Ollama] requestId=${requestId} bodyLen=${body.length}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body,
        signal: controller.signal,
      });

      const elapsedMs = Date.now() - startTime;
      const bodyText = await response.text().catch(() => '');

      if (!response.ok) {
        this.logger.error(
          `[Ollama] requestId=${requestId} failed status=${response.status} elapsedMs=${elapsedMs} body=${bodyText.slice(0, 1500)}`,
        );
        return '';
      }

      const data = this.safeJsonParse<Record<string, any>>(bodyText);
      if (!data) {
        this.logger.error(
          `[Ollama] requestId=${requestId} ok-but-json-parse-failed elapsedMs=${elapsedMs} raw=${bodyText.slice(0, 1500)}`,
        );
        return '';
      }

      const output = this.extractOutputText(data) || '';

      this.logger.log(
        `[Ollama] requestId=${requestId} ok elapsedMs=${elapsedMs} outputLen=${output.length} rawLen=${bodyText.length}`,
      );
      
      return output;
    } catch (error: any) {
      const elapsedMs = Date.now() - startTime;
      const errMsg =
        error?.name === 'AbortError'
          ? `timeout(${this.timeoutMs}ms)`
          : (error?.message ?? String(error));

      this.logger.error(
        `[Ollama] requestId=${requestId} failed elapsedMs=${elapsedMs} err=${errMsg}`,
      );
      this.logger.error(
        `[Ollama] requestId=${requestId} errorName=${error?.name} errorStack=${error?.stack ?? ''}`,
      );

      return '';
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildPromptSafe(req: ReportSummaryRequest): string {
    const summary = (req as any)?.summary?.trim?.() || '없음';
    const reason = (req as any)?.reason?.trim?.() || '없음';

    const solsRaw = (req as any)?.solutions;
    const solutionsArr: string[] = Array.isArray(solsRaw) ? solsRaw : [];

    const solutions =
      solutionsArr.length > 0
        ? solutionsArr.map((item, idx) => `${idx + 1}. ${item}`).join(' / ')
        : '없음';

    return (
      `아래 정보를 참고하여 결과를 존댓말로 세 줄로 작성하세요. ` +
      `첫째 줄은 이슈 기능(네비,HW,SW 등), 둘째 줄은 이슈 심각도(상/중/하), 셋째 줄은 이슈 요약(20자 내외). ` +      
      `SUMMARY: ${summary}\nREASON: ${reason}\nSOLUTIONS: ${solutions}`
    );
  }

  private safeJsonParse<T>(value: string): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private extractOutputText(data: Record<string, any> | null): string | null {
    if (!data) return null;

    if (typeof data.response === 'string' && data.response.trim()) return data.response;
    if (typeof data.output === 'string' && data.output.trim()) return data.output;
    if (typeof data.data === 'string' && data.data.trim()) return data.data;

    if (Array.isArray(data.results) && data.results.length > 0) {
      for (const result of data.results) {
        if (!result) continue;

        if (typeof result.response === 'string' && result.response.trim()) return result.response;
        if (typeof result.output === 'string' && result.output.trim()) return result.output;
        if (typeof result.content === 'string' && result.content.trim()) return result.content;

        if (Array.isArray(result.content)) {
          const contentText = result.content
            .map((item: any) => item?.text || item?.content || '')
            .join(' ')
            .trim();
          if (contentText) return contentText;
        }
      }
    }

    return null;
  }
}