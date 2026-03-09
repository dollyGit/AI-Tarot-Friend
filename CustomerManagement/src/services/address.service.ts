/**
 * Address Service — Customer Address CRUD (P2.4)
 */
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { errors } from '../api/middleware/error-handler.js';
import type {
  CreateAddressInput,
  UpdateAddressInput,
} from '../api/validators/customer.validator.js';

export class AddressService {
  /**
   * Add an address to a customer.
   * If isDefault=true, unset the previous default first.
   */
  async create(customerId: string, data: CreateAddressInput) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    // If setting as default, unset existing default
    if (data.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.customerAddress.create({
      data: { customerId, ...data },
    });

    logger.info({ customerId, addressId: address.id }, 'Address created');
    return address;
  }

  /**
   * List all addresses for a customer.
   */
  async list(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw errors.notFound('Customer');

    return prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Update an address.
   */
  async update(customerId: string, addressId: string, data: UpdateAddressInput) {
    const address = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw errors.notFound('Address');

    // If setting as default, unset others
    if (data.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.customerAddress.update({
      where: { id: addressId },
      data,
    });

    logger.info({ customerId, addressId }, 'Address updated');
    return updated;
  }

  /**
   * Delete an address.
   */
  async delete(customerId: string, addressId: string) {
    const address = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!address) throw errors.notFound('Address');

    await prisma.customerAddress.delete({ where: { id: addressId } });

    logger.info({ customerId, addressId }, 'Address deleted');
    return { success: true };
  }
}

export const addressService = new AddressService();
