import { and, or, rule } from "graphql-shield";
import { Context } from "../context";
import { isAuthenticated, isGroupAdmin, isSubscriptionInvoiceOwner } from "./utils";
import { groupSubscriptionForInvoice } from "../repository/SubscriptionInvoiceRepository";

const subscriptionInvoiceOwnerFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isSubscriptionInvoiceOwner(ctx, args.input.invoiceId)
  },
)

const subscriptionInvoiceOwnerFromParent = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isSubscriptionInvoiceOwner(ctx, parent.id)
  },
)

const invoiceGroupOwner = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    const groupSubscription = await groupSubscriptionForInvoice(ctx, parent.id)
    if (!groupSubscription) {
      return false
    }
    return isGroupAdmin(ctx, groupSubscription.groupId)
  },
)

export const SubscriptionInvoicePermissions = {
  "*": and(isAuthenticated, or(subscriptionInvoiceOwnerFromParent, invoiceGroupOwner)),
}

export const SubscriptionInvoiceMutationPermissions = {
  resetPayment: and(isAuthenticated, subscriptionInvoiceOwnerFromArgs),
}
