import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryOrderController } from './delivery-order.controller';

describe('DeliveryOrderController', () => {
  let controller: DeliveryOrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryOrderController],
    }).compile();

    controller = module.get<DeliveryOrderController>(DeliveryOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
