import { Test, TestingModule } from '@nestjs/testing';
import { BlService } from './bl.service';

describe('BlService', () => {
  let service: BlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlService],
    }).compile();

    service = module.get<BlService>(BlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
