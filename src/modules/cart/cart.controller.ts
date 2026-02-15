import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CartService } from './cart.service'
import { AddToCartDto } from './dto/add-to-cart.dto'
import { GetUser } from '../auth/decorators/get-user.decorator'
import { UpdateCartItemDto } from './dto/update-cart-item.dto'


@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@GetUser() user: { id: string }) {
    return this.cartService.getCart(user.id)
  }

  @Post('items')
  addItem(
    @GetUser() user: { id: string },
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addItem(user.id, dto)
  }

  @Patch('items/:productId')
  updateItem(
    @GetUser() user: { id: string },
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, productId, dto)
  }

  @Delete('items/:productId')
  removeItem(
    @GetUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(user.id, productId)
  }

  @Delete('clear')
  clear(@GetUser() user: { id: string }) {
    return this.cartService.clearCart(user.id)
  }
}
