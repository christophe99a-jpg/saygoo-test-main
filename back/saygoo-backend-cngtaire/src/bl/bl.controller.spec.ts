import { Test, TestingModule } from '@nestjs/testing';
import { BlController } from './bl.controller';

describe('BlController', () => {
  let controller: BlController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlController],
    }).compile();

    controller = module.get<BlController>(BlController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
