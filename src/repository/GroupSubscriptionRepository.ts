import { Context } from "../context";
import {logger} from "../logger";

export interface CreateSubscriptionInput {
  fee: number
  duration: number
  description: string
}

export interface UpdateSubscriptionInput {
  subscriptionId: string
  fee: number
  description?: string
}

export interface DeleteSubscriptionInput {
  subscriptionId: string
}

export interface ToggleSubscriptionActiveInput {
  subscriptionId: string
}

export async function getGroupSubscription(ctx: Context, groupSubscriptionId: string) {
  return await ctx.prisma.groupSubscription.findUnique({
    where: {id: groupSubscriptionId},
  })
}

export async function createSubscription(ctx: Context, input: CreateSubscriptionInput) {
  const { fee, duration, description } = input

  try {
    const myMembership = await ctx.prisma.groupMembership.findFirst({
      where: { memberId: ctx.userId, role: "ADMIN", status: "APPROVED" },
      select: { groupId: true },
    })

    await ctx.prisma.groupSubscription.create({
      data: { active: true, groupId: myMembership.groupId, price: fee, duration, description },
    })
  } catch (e) {
    logger.error({ message: "Error creating subscription option", fee, duration, description, error: e.message })
    throw new Error("Error creating subscription option")
  }
}

export async function updateSubscription(ctx: Context, input: UpdateSubscriptionInput) {
  const { subscriptionId, fee, description } = input

  try {
    await ctx.prisma.groupSubscription.update({
      where: { id: subscriptionId },
      data: { price: fee, description },
    })
  } catch (e) {
    logger.error({ message: "Error updating subscription", subscriptionId, fee, description, error: e.message })
    throw new Error("Error updating subscription")
  }
}

export async function deleteSubscription(ctx: Context, input: DeleteSubscriptionInput) {
  const { subscriptionId } = input

  const memberCount = await getSubscriptionMemberCount(ctx, subscriptionId)
  if (memberCount > 0) {
    logger.error({ message: "Tried to delete a subscription option in use", subscriptionId })
    throw new Error("This subscription option is being used. Edit it instead.")
  }

  await ctx.prisma.groupSubscription.delete({ where: { id: subscriptionId } })
}

export async function toggleSubscriptionActive(ctx: Context, input: ToggleSubscriptionActiveInput): Promise<boolean> {
  const { subscriptionId } = input
  const subscription = await getGroupSubscription(ctx, subscriptionId)

  if (!subscription) {
    throw new Error("Could not find subscription")
  }

  try {
    await ctx.prisma.groupSubscription.update({
      where: {id: subscriptionId},
      data: {active: !subscription.active},
    })
  } catch (e) {
    throw new Error("Error updating subscription")
  }

  return true
}

export async function getSubscriptionMemberCount(ctx: Context, groupSubscriptionId: string) {
  return await ctx.prisma.memberSubscription.count({
    where: { groupSubscriptionId },
  })
}

export const getGroupForSubscription = async (ctx: Context, subscriptionId: string) => {
  try {
    const subscription = await ctx.prisma.groupSubscription.findUnique({
      where: { id: subscriptionId },
      include: { group: true },
    })
    return subscription.group
  } catch (e) {
    logger.error({ message: "[getGroupForSubscription] Error", userId: ctx.userId, subscriptionId, e })
  }
}
