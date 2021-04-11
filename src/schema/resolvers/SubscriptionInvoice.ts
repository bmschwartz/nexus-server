import { Context } from "../../context"

export const SubscriptionInvoiceResolvers = {
  async __resolveReference(invoice: any, ctx: Context) {
    return ctx.prisma.subscriptionInvoice.findUnique({
      where: {
        id: invoice.id,
      },
    })
  },
}
