import { or, and, rule } from "graphql-shield";
import {
  isAuthenticated,
  isGroupAdmin,
  isGroupTrader,
} from "./utils";
import { Context } from "../context";
import { getMyGroup } from "../repository/GroupRepository";

const subscriptionGroupAdmin = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    const myGroup = await getMyGroup(ctx)
    if (!myGroup) {
      return false
    }
    return isGroupAdmin(myGroup.id, args, ctx, info)
  },
)

const subscriptionGroupTrader = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    const myGroup = await getMyGroup(ctx)
    if (!myGroup) {
      return false
    }
    return isGroupTrader(myGroup.id, args, ctx, info)
  },
)

export const GroupSubscriptionPermissions = {
  "*": isAuthenticated,
  memberCount: and(isAuthenticated, or(subscriptionGroupAdmin, subscriptionGroupTrader)),
}

export const GroupSubscriptionMutationPermissions = {
  createGroupSubscription: isAuthenticated,
  updateGroupSubscription: and(isAuthenticated, subscriptionGroupAdmin),
  deleteGroupSubscription: and(isAuthenticated, subscriptionGroupAdmin),
  toggleSubscriptionActive: and(isAuthenticated, subscriptionGroupAdmin),
}
