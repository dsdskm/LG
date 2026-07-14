import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmConfigEntity } from '../db/llm-config.entity';

@Injectable()
export class LlmConfigService {
  constructor(
    @InjectRepository(LlmConfigEntity)
    private readonly repo: Repository<LlmConfigEntity>,
  ) {}

  async getAll(): Promise<LlmConfigEntity[]> {
    await this.ensureDefaults();
    return this.repo.find({ order: { provider: 'ASC' } });
  }

  async getProviderPayload(providerInput: string): Promise<LlmConfigEntity> {
    const provider = this.toInstructionProvider(providerInput);
    await this.getInstruction(provider);

    const row = await this.repo.findOne({ where: { provider } });
    if (!row) {
      throw new Error('not found');
    }

    return row;
  }

  async upsertProviderPayload(
    providerInput: string,
    instructionInput: string,
  ): Promise<LlmConfigEntity> {
    return this.upsertByProvider(providerInput, instructionInput);
  }

  async getActiveProviderPayload(): Promise<{ provider: string }> {
    const provider = await this.getActiveProvider();
    return { provider };
  }

  async setActiveProviderPayload(
    providerInput: string,
  ): Promise<{ provider: string; updatedAt: Date }> {
    const row = await this.setActiveProvider(providerInput);
    return { provider: row.provider, updatedAt: row.updatedAt };
  }

  async getInstruction(provider: string): Promise<string> {
    const existing = await this.repo.findOne({ where: { provider } });
    if (existing?.instruction?.trim()) {
      return existing.instruction.trim();
    }

    return '';
  }

  async getActiveProvider(): Promise<string> {
    await this.ensureDefaults();

    const active = await this.repo.findOne({ where: { isActive: true } });
    if (active?.provider) {
      return active.provider;
    }

    return '';
  }

  async setActiveProvider(providerInput: string): Promise<LlmConfigEntity> {
    const provider = this.toRuntimeProvider(providerInput);
    if (provider !== 'off' && provider !== 'mock') {
      await this.getInstruction(provider);
    }

    await this.repo
      .createQueryBuilder()
      .update(LlmConfigEntity)
      .set({ isActive: false })
      .execute();

    const target = await this.repo.findOne({ where: { provider } });
    target!!.isActive = true;
    return this.repo.save(target!!);
  }

  async upsertByProvider(
    providerInput: string,
    instructionInput: string,
  ): Promise<LlmConfigEntity> {
    const provider = this.toInstructionProvider(providerInput);
    const instruction = String(instructionInput ?? '').trim();
    if (!instruction) {
      throw new Error('instruction is required');
    }

    const existing = await this.repo.findOne({ where: { provider } });
    if (existing) {
      existing.instruction = instruction;
      return this.repo.save(existing);
    }

    const entity = this.repo.create({
      provider,
      instruction,
      isActive: false,
    });
    return this.repo.save(entity);
  }

  private async ensureDefaults(): Promise<void> {
    await this.getInstruction('azure');
    await this.getInstruction('vertex');

    const hasActive = await this.repo.exist({ where: { isActive: true } });
    if (!hasActive) {
      await this.setActiveProvider('vertex');
    }
  }

  private toRuntimeProvider(providerInput: string): string {
    return String(providerInput ?? '').trim().toLowerCase();
  }

  private toInstructionProvider(providerInput: string): string {
    const provider = this.toRuntimeProvider(providerInput);
    return provider;
  }
}
