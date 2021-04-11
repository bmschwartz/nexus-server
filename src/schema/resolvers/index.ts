import { Query } from "./Query"
import { Mutation } from "./Mutation"
import { UserResolvers } from "./User"
import { OrderSetResolvers } from "./OrderSetResolvers"
import { OrderResolvers } from "./OrderResolvers"
import { GroupResolvers } from "./GroupResolvers";
import { GroupMembershipResolvers } from "./GroupMembershipResolvers"
import { BinanceResolvers } from "./BinanceResolvers"
import { BitmexResolvers } from "./BitmexResolvers"
import { ExchangeAccountResolvers } from "./ExchangeAccountResolvers";
import { PositionResolvers } from "./PositionResolvers";
import { GroupSubscriptionResolvers } from "./GroupSubscription"
import { MemberSubscriptionResolvers } from "./MemberSubscription"
import { SubscriptionInvoiceResolvers } from "./SubscriptionInvoice"

export const resolvers: any = {
  Query,
  Mutation,
  User: UserResolvers,
  Order: OrderResolvers,
  Group: GroupResolvers,
  Position: PositionResolvers,
  OrderSet: OrderSetResolvers,
  BitmexCurrency: BitmexResolvers,
  BinanceCurrency: BinanceResolvers,
  GroupMembership: GroupMembershipResolvers,
  ExchangeAccount: ExchangeAccountResolvers,
  GroupSubscription: GroupSubscriptionResolvers,
  MemberSubscription: MemberSubscriptionResolvers,
  SubscriptionInvoice: SubscriptionInvoiceResolvers,
}
