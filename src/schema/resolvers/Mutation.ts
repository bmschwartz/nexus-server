import { UserMutations } from "./User"
import { OrderMutations } from "./OrderResolvers"
import { OrderSetMutations } from "./OrderSetResolvers"
import { ExchangeAccountMutations } from "./ExchangeAccountResolvers";
import { PositionMutations } from "./PositionResolvers";
import { GroupMembershipMutations } from "./GroupMembershipResolvers";
import { GroupMutations } from "./GroupResolvers";
import { GroupSubscriptionMutations } from "./GroupSubscription";
import { MemberSubscriptionMutations } from "./MemberSubscription";

export const Mutation = {
  ...UserMutations,
  ...GroupMutations,
  ...OrderMutations,
  ...OrderSetMutations,
  ...PositionMutations,
  ...GroupMembershipMutations,
  ...ExchangeAccountMutations,
  ...GroupSubscriptionMutations,
  ...MemberSubscriptionMutations,
}
