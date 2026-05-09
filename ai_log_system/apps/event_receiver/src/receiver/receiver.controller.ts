// apps/event_receiver/src/receiver.controller.ts
import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ReceiverService } from './receiver.service';
import { updateFirestoreTriggerTime } from '../firebase/firestore';

@Controller()
export class ReceiverController {
  private readonly logger = new Logger(ReceiverController.name);
  constructor(private readonly svc: ReceiverService) {}

  /**
   * POST /ingest/mcap
   * - body: raw Buffer (main.ts에서 express.raw 설정 필요)
   * - return: HTTP status code only (body 없음)
   */
  @Post('ingest/mcap')
  async ingestMcap(@Req() req: Request, @Res() res: Response) {
    const buf = req.body as Buffer;

    const status = await this.svc.handleMcapBuffer(buf);
    return res.sendStatus(status);
  }

  /**
   * PATCH /events/:id/status
   * - body: { status: string }
   */
  @Patch('events/:id/status')
  async updateEventStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const eventId = Number(id);
    let rawStatus: unknown = undefined;

    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      rawStatus = (body as any).status;
    } else if (typeof body === 'string' && body.trim()) {
      try {
        const parsed = JSON.parse(body);
        rawStatus = parsed?.status;
      } catch {
        rawStatus = undefined;
      }
    } else if (Buffer.isBuffer(body) && body.length > 0) {
      try {
        const text = body.toString('utf8');
        const parsed = JSON.parse(text);
        rawStatus = parsed?.status;
      } catch {
        rawStatus = undefined;
      }
    }

    const trimmedStatus = String(rawStatus ?? '').trim();
    this.logger.log(
      `updateEventStatus received id=${id} eventId=${eventId} body=${JSON.stringify(body)} rawStatus=${rawStatus} trimmedStatus=${trimmedStatus}`,
    );
    await this.svc.updateEventStatus(eventId, trimmedStatus);

    try {
      await updateFirestoreTriggerTime();
      this.logger.log(`Firestore trigger updated for eventId=${eventId}`);
    } catch (error: any) {
      this.logger.error(
        `Firestore trigger update failed for eventId=${eventId}: ${error?.message ?? error}`,
      );
    }

    return res.sendStatus(204);
  }

  /**
   * PATCH /events/:id/analysis-ids
   * - body: { analysisIds: string[] }
   */
  @Patch('events/:id/analysis-ids')
  async updateEventAnalysisIds(
    @Param('id') id: string,
    @Body() body: { analysisIds?: number[] },
    @Res() res: Response,
  ) {
    const analysisIds = Array.isArray(body?.analysisIds)
      ? body!.analysisIds
      : null;
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0 || !analysisIds)
      return res.sendStatus(400);

    await this.svc.updateEventAnalysisIds(eventId, analysisIds);
    return res.sendStatus(204);
  }

  /**
   * PATCH /events/:id/solution-ids
   * - body: { solutionIds: string[] }
   */
  @Patch('events/:id/solution-ids')
  async updateEventSolutionIds(
    @Param('id') id: string,
    @Body() body: { solutionIds?: number[] },
    @Res() res: Response,
  ) {
    const solutionIds = Array.isArray(body?.solutionIds)
      ? body!.solutionIds
      : null;
    const eventId = Number(id);
    if (!Number.isInteger(eventId) || eventId <= 0 || !solutionIds)
      return res.sendStatus(400);

    await this.svc.updateEventSolutionIds(eventId, solutionIds);
    return res.sendStatus(204);
  }

  @Get('events')
  async getAllEvents() {
    return this.svc.fetchEvents();
  }

  @Get('events/:id')
  async getEventById(@Param('id') id: string) {
    const numericEventId = Number(id);
    this.logger.log(`getEventById received id=${id} parsedId=${numericEventId}`);
    if (!Number.isInteger(numericEventId) || numericEventId <= 0) return null;
    return this.svc.fetchEventById(numericEventId);
  }
}
