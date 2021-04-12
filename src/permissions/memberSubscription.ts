import { and, or, rule } from "graphql-shield";
import { isAuthenticated, isGroupAdmin, isMembershipUser, isSubscriptionUser } from "./utils";
import { Context } from "../context";
import { groupForMemberSubscription } from "../repository/MemberSubscriptionRepository";

const subscriptionUserFromParent = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isSubscriptionUser(ctx, parent.id)
  },
)

const subscriptionUserFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isSubscriptionUser(ctx, args.input.subscriptionId)
  },
)

const groupAdminFromParent = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    const group = await groupForMemberSubscription(ctx, parent.id)
    if (!group) {
      return false
    }
    return isGroupAdmin(group.id, args, ctx, info)
  },
)

const membershipUserFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    return isMembershipUser(args.input.membershipId, args, ctx, info)
  },
)

export const MemberSubscriptionPermissions = {
  "*": and(isAuthenticated, or(groupAdminFromParent, subscriptionUserFromParent)),
}

export const MemberSubscriptionMutationPermissions = {
  payMemberSubscription: and(isAuthenticated, membershipUserFromArgs),
  switchSubscriptionOption: and(isAuthenticated, membershipUserFromArgs),
  cancelMemberSubscription: and(isAuthenticated, subscriptionUserFromArgs),
  activateMemberSubscription: and(isAuthenticated, subscriptionUserFromArgs),
}
