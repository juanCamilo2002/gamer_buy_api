import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { Prisma } from 'src/generated/prisma/client'

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty')
    }

    return this.prisma.$transaction(async (tx) => {
      let subtotal = new Prisma.Decimal(0)

      // Validar stock
      for (const item of cart.items) {
        if (item.product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${item.product.name}`,
          )
        }

        subtotal = subtotal.plus(
          new Prisma.Decimal(item.product.price).mul(item.quantity),
        )
      }

      const total = subtotal

      // Crear orden
      const order = await tx.order.create({
        data: {
          userId,
          subtotal,
          total,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
            })),
          },
        },
        include: { items: true },
      })

      // Descontar stock
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })
      }

      // Vaciar carrito
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      })

      return order
    })
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { product: true } } },
    })

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    return order
  }

  async updateStatus(orderId: string, status: any) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    })
  }
}
