import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) { }

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } }
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } }
      })
    }

    return cart;
  }

  async getCart(userId: string) {
    return this.getOrCreateCart(userId);
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId
        }
      }
    });

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + dto.quantity },
      })
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        quantity: dto.quantity
      }
    })
  }

  async updateItem(userId: string, productId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        }
      }
    });

    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity },
    })
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        }
      }
    });

    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    return this.prisma.cartItem.delete({
      where: { id: item.id },
    })
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { message: 'Cart cleared' };
  }
}
