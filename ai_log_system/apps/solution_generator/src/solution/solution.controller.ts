import { Body, Controller, Get, Logger, Param, Post } from "@nestjs/common";
import { SolutionService, type SolutionCreateRequest, type SolutionCreateResponse } from "./solution.service";

@Controller("solutions")
export class SolutionController {
     private readonly logger = new Logger(SolutionController.name);
    constructor(private readonly solutionService: SolutionService) { }

    @Post()
    async createSolution(@Body() body: SolutionCreateRequest): Promise<SolutionCreateResponse> {
        this.logger.log(`createSolution received eventId=${body.eventId}`);
        return this.solutionService.generateSolution(body);
    }

    @Get(":eventId")
    async getSolutions(@Param("eventId") eventId: string): Promise<{ solutions: string[] }> {
        const numericEventId = Number(eventId);
        if (!Number.isInteger(numericEventId) || numericEventId <= 0) {
            return { solutions: [] };
        }
        return { solutions: await this.solutionService.fetchSolutions(numericEventId) };
    }
}
