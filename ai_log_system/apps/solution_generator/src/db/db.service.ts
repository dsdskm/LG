import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SolutionEntity } from "./solution.entity";

@Injectable()
export class DbService {
    constructor(
        @InjectRepository(SolutionEntity)
        private readonly repo: Repository<SolutionEntity>,
    ) { }

    async saveSolution(eventId: number, solutions: string[]): Promise<SolutionEntity> {
        const entity = this.repo.create({ eventId, solutions });
        return this.repo.save(entity);
    }

    async findById(id: number): Promise<SolutionEntity | null> {
        const solution = await this.repo.findOne({ where: { id } });
        return solution ?? null;
    }

    async findByEventId(eventId: number): Promise<SolutionEntity | null> {
        const solution = await this.repo.findOne({ where: { eventId } });
        return solution ?? null;
    }
}
