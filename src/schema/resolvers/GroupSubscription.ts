import { Context } from "../../context"
import {
  createSubscription,
  deleteSubscription,
  updateSubscription,
  toggleSubscriptionActive,
  getSubscriptionMemberCount, getGroupForSubscription,
} from "../../repository/GroupSubscriptionRepository";

export const GroupSubscriptionResolvers = {
  async memberCount(subscription: any, args: any, ctx: Context) {
    return getSubscriptionMemberCount(ctx, subscription.id)
  },
  async group(subscription: any, args: any, ctx: Context) {
    return getGroupForSubscription(ctx, subscription.id)
  },
}

export const GroupSubscriptionMutations = {
  async createGroupSubscription(_: any, args: any, ctx: Context) {
    const { input: { fee, duration, description } } = args

    try {
      await createSubscription(ctx, { fee, duration, description })
    } catch (e) {
      return { success: false, error: e.message }
    }

    return { success: true }
  },

  async updateGroupSubscription(_: any, args: any, ctx: Context) {
    const { input: { subscriptionId, fee, description } } = args

    try {
      await updateSubscription(ctx, { subscriptionId, fee, description })
    } catch (e) {
      return { success: false, error: e.message }
    }

    return { success: true }
  },

  async deleteGroupSubscription(_: any, args: any, ctx: Context) {
    const { input: { subscriptionId } } = args

    try {
      await deleteSubscription(ctx, { subscriptionId })
    } catch (e) {
      return { success: false, error: e.message }
    }

    return { success: true }
  },

  async toggleSubscriptionActive(_: any, args: any, ctx: Context) {
    const { input: { subscriptionId } } = args

    try {
      await toggleSubscriptionActive(ctx, { subscriptionId })
    } catch (e) {
      return { success: false, error: e.message }
    }

    return { success: true }
  },
}
