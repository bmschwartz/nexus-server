import { shield } from "graphql-shield"
import { GroupMutationPermissions, GroupPermissions, GroupQueryPermissions } from "./group"
import { GroupSubscriptionPermissions, GroupSubscriptionMutationPermissions } from "./groupSubscription"
import { MemberSubscriptionPermissions, MemberSubscriptionMutationPermissions } from "./memberSubscription"
import { SubscriptionInvoiceMutationPermissions, SubscriptionInvoicePermissions } from "./subscriptionInvoice";
import { GroupMembershipQueryPermissions, GroupMembershipPermissions, GroupMembershipMutationPermissions } from "./groupMembership"
import {
  ExchangeAccountMutationPermissions,
  ExchangeAccountPermissions,
  ExchangeAccountQueryPermissions,
} from "./exchangeAccount";
import { OrderMutationPermissions, OrderPermissions, OrderQueryPermissions } from "./order";
import { OrderSetMutationPermissions, OrderSetPermissions, OrderSetQueryPermissions } from "./orderSet";
import { PositionMutationPermissions, PositionPermissions, PositionQueryPermissions } from "./position";

export const permissions = shield({
  Query: {
    ...GroupQueryPermissions,
    ...GroupMembershipQueryPermissions,

    ...OrderQueryPermissions,
    ...OrderSetQueryPermissions,
    ...PositionQueryPermissions,
    ...ExchangeAccountQueryPermissions,
  },
  Mutation: {
    ...GroupMutationPermissions,
    ...GroupMembershipMutationPermissions,
    ...GroupSubscriptionMutationPermissions,
    ...MemberSubscriptionMutationPermissions,
    ...SubscriptionInvoiceMutationPermissions,

    ...OrderMutationPermissions,
    ...OrderSetMutationPermissions,
    ...PositionMutationPermissions,
    ...ExchangeAccountMutationPermissions,
  },
  Group: GroupPermissions,
  GroupMembership: GroupMembershipPermissions,
  GroupSubscription: GroupSubscriptionPermissions,
  MemberSubscription: MemberSubscriptionPermissions,
  SubscriptionInvoice: SubscriptionInvoicePermissions,

  Order: OrderPermissions,
  OrderSet: OrderSetPermissions,
  Position: PositionPermissions,
  ExchangeAccount: ExchangeAccountPermissions,
})
