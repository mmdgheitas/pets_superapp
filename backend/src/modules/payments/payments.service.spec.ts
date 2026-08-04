import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ZarinpalService } from './zarinpal.service';

const mockOrders = { markPaid: jest.fn() };

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let zarinpal: { requestPayment: jest.Mock; verifyPayment: jest.Mock };

  const configValues: Record<string, unknown> = {
    'app.apiPublicUrl': 'http://api.test',
    'app.webAppUrl': 'http://web.test',
    'app.zarinpal.sandbox': true,
    'app.zarinpal.mock': false,
  };
  const mockConfig = { get: jest.fn((key: string) => configValues[key]) };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      order: { findUnique: jest.fn() },
      payment: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      orderItem: { aggregate: jest.fn(), groupBy: jest.fn() },
      seller: { findMany: jest.fn() },
      // Prisma tx object ≈ the client itself for our purposes
      $transaction: jest.fn(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
    };
    zarinpal = { requestPayment: jest.fn(), verifyPayment: jest.fn() };
    service = new PaymentsService(
      prisma,
      mockConfig as any,
      zarinpal as unknown as ZarinpalService,
      mockOrders as any,
    );
  });

  describe('requestPayment', () => {
    it('creates an INITIATED payment and returns the gateway URL', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order1',
        userId: 'u1',
        status: 'PENDING_PAYMENT',
        total: '251000',
        payment: null,
        user: { phone: '09121112233' },
      });
      zarinpal.requestPayment.mockResolvedValue({
        authority: 'A100',
        startPayUrl: 'https://sandbox.zarinpal.com/pg/StartPay/A100',
      });
      prisma.payment.create.mockResolvedValue({ id: 'pay1', authority: 'A100' });

      const result = await service.requestPayment('u1', 'order1');

      expect(zarinpal.requestPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amountIrr: 251000,
          callbackUrl: 'http://api.test/api/v1/payments/callback',
          mobile: '09121112233',
        }),
      );
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order1',
          amount: 251000,
          gateway: 'ZARINPAL',
          status: 'INITIATED',
          authority: 'A100',
        }),
      });
      expect(result.paymentUrl).toContain('StartPay');
    });

    it('rejects payment for someone else\u2019s order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o', userId: 'other', status: 'PENDING_PAYMENT' });
      await expect(service.requestPayment('u1', 'o')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects payment for an already-paid order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o', userId: 'u1', status: 'PAID' });
      await expect(service.requestPayment('u1', 'o')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('handleCallback', () => {
    it('verifies and marks the order paid, redirecting to success URL', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay1',
        orderId: 'order1',
        status: 'INITIATED',
        authority: 'A100',
        amount: '1000',
        order: { id: 'order1' },
      });
      zarinpal.verifyPayment.mockResolvedValue({ success: true, refId: '999001' });
      mockOrders.markPaid.mockResolvedValue({});

      const url = await service.handleCallback('A100', 'OK');

      expect(url).toBe('http://web.test/payment/result?status=success&order=order1&ref=999001');
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS', refId: '999001' }) }),
      );
      expect(mockOrders.markPaid).toHaveBeenCalledWith('order1', '999001');
    });

    it('marks payment FAILED when the user cancels at the gateway', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay1',
        orderId: 'order1',
        status: 'INITIATED',
        authority: 'A100',
        amount: '1000',
        order: { id: 'order1' },
      });
      const url = await service.handleCallback('A100', 'NOK');
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FAILED' } }),
      );
      expect(url).toContain('status=failed');
      expect(zarinpal.verifyPayment).not.toHaveBeenCalled();
    });

    it('is idempotent when an already-verified callback is replayed', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay1',
        orderId: 'order1',
        status: 'SUCCESS',
        authority: 'A100',
        order: { id: 'order1' },
      });
      const url = await service.handleCallback('A100', 'OK');
      expect(url).toBe('http://web.test/payment/result?status=success&order=order1');
      expect(zarinpal.verifyPayment).not.toHaveBeenCalled();
      expect(mockOrders.markPaid).not.toHaveBeenCalled();
    });
  });

  describe('commissionReport', () => {
    it('aggregates gross sales, platform commission, and seller payouts', async () => {
      prisma.orderItem.aggregate.mockResolvedValue({
        _sum: { totalPrice: 1000000, commissionAmount: 70000, sellerAmount: 930000 },
      });
      prisma.orderItem.groupBy.mockResolvedValue([
        { sellerId: 's1', _sum: { totalPrice: 600000, commissionAmount: 30000, sellerAmount: 570000 } },
        { sellerId: 's2', _sum: { totalPrice: 400000, commissionAmount: 40000, sellerAmount: 360000 } },
      ]);
      prisma.seller.findMany.mockResolvedValue([
        { id: 's1', shopName: 'فروشگاه یک' },
        { id: 's2', shopName: 'فروشگاه دو' },
      ]);

      const report = await service.commissionReport(30);

      expect(report.grossSales).toBe(1000000);
      expect(report.platformCommission).toBe(70000);
      expect(report.sellersPayout).toBe(930000);
      expect(report.bySeller).toHaveLength(2);
      expect(report.bySeller[0]).toMatchObject({ commission: 30000, payout: 570000 });
      // conservation: commission + payout = gross per seller
      for (const row of report.bySeller) {
        expect(row.commission + row.payout).toBe(row.grossSales);
      }
    });
  });
});
