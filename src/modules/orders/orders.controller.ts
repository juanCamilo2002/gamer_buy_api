import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import { GetUser } from 'src/modules/auth/decorators/get-user.decorator'
import { Roles } from 'src/modules/auth/decorators/roles.decorator'

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  checkout(@GetUser() user: { id: string }) {
    return this.ordersService.checkout(user.id)
  }

  @Get()
  findMyOrders(@GetUser() user: { id: string }) {
    return this.ordersService.findMyOrders(user.id)
  }

  @Get(':id')
  findOne(
    @GetUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.ordersService.findOne(user.id, id)
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.ordersService.updateStatus(id, body.status)
  }
}
