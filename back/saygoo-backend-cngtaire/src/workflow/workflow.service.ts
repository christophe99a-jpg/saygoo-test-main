import { Injectable } from '@nestjs/common';
import { InvoiceService } from '../invoice/invoice.service';
import { DeliveryOrderService } from '../delivery-order/delivery-order.service';
import { InvoiceStatus } from '../invoice/invoice.entity';

@Injectable()
export class WorkflowService {
  constructor(
    private invoiceService: InvoiceService,
    private deliveryOrderService: DeliveryOrderService,
  ) {}

  async trigger(bl_id: string): Promise<{ message: string; do_id?: string }> {
    // Vérifier si une facture existe et est payée
    const invoices = await this.invoiceService.findByBl(bl_id);

    if (!invoices || invoices.length === 0) {
      return { message: 'Aucune facture trouvée pour ce BL' };
    }

    const paidInvoice = invoices.find(inv => inv.status === InvoiceStatus.PAID);

    if (!paidInvoice) {
      return { message: 'Facture non payée - DO non généré' };
    }

    // Générer et valider automatiquement le DO
    const deliveryOrder = await this.deliveryOrderService.generate(bl_id);
    await this.deliveryOrderService.validate(deliveryOrder.id);

    return {
      message: 'Workflow exécuté - DO validé automatiquement',
      do_id: deliveryOrder.id,
    };
  }
}