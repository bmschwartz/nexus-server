import {
  PrismaClient,
  Group,
  GroupMembership,
  SubscriptionInvoice,
  MemberSubscription,
  InvoiceStatus,
} from "@prisma/client";
import { Context } from "../context";
import { createInvoice } from "./SubscriptionInvoiceRepository";
import { logger } from "../logger";

export interface CreateMemberSubscriptionInput {
  membershipId: string
  groupId: string
  subscriptionOptionId?: string
}

export interface PayMemberSubscriptionInput {
  groupId: string
  membershipId: string
  subscriptionOptionId?: string
}

export interface PayMemberSubscriptionResult {
  invoiceId?: string
  error?: string
}

export interface ResetPaymentInput {
  invoiceId: string
}

export interface ResetPaymentResult {
  error?: string
}

export interface ActivateMemberSubscriptionInput {
  subscriptionId: string
}

export interface ActivateMemberSubscriptionResult {
  success: boolean
  error?: string
}

export interface CancelMemberSubscriptionInput {
  subscriptionId: string
}

export interface CancelMemberSubscriptionResult {
  success: boolean
  error?: string
}

export interface SwitchSubscriptionOptionInput {
  membershipId: string
  subscriptionOptionId: string
}

export interface SwitchSubscriptionOptionResult {
  success: boolean
  error?: string
}

export interface UpdateSubscriptionDatesInput {
  subscriptionId: string
  endDate: Date
  startDate?: Date
}

export const groupForMemberSubscription = async (ctx: Context, memberSubscriptionId: string): Promise<Group> => {
  try {
    const subscription = await ctx.prisma.memberSubscription.findUnique({
      where: { id: memberSubscriptionId },
      include: {
        groupSubscription: {
          include: {
            group: true,
          },
        },
      },
    })
    return subscription.groupSubscription.group
  } catch (e) {
    logger.error({ message: "[groupForMemberSubscription] Error", userId: ctx.userId, memberSubscriptionId, e })
  }
}

export const membershipForSubscription = async (ctx: Context, memberSubscriptionId: string): Promise<GroupMembership> => {
  try {
    const subscription = await ctx.prisma.memberSubscription.findUnique({
      where: { id: memberSubscriptionId },
      include: {
        groupMembership: true,
      },
    })
    return subscription.groupMembership
  } catch (e) {
    logger.error({ message: "[membershipForSubscription] Error", userId: ctx.userId, memberSubscriptionId, e })
  }
}

export async function payMemberSubscription(
  ctx: Context,
  { membershipId, groupId, subscriptionOptionId }: PayMemberSubscriptionInput,
): Promise<PayMemberSubscriptionResult> {
  let invoice: SubscriptionInvoice

  try {
    const memberSubscription = await createOrGetMemberSubscription(ctx, { membershipId, groupId, subscriptionOptionId })

    if (!memberSubscription) {
      return { error: "Subscription does not exist" }
    }

    const groupSubscription = await ctx.prisma.groupSubscription.findUnique({
      where: { id: memberSubscription.groupSubscriptionId },
    })

    if (!groupSubscription) {
      return { error: "Could not find matching group subscription" }
    }

    invoice = await createInvoice(ctx.prisma, ctx.billing, { subscriptionId: memberSubscription.id, groupSubscription })

  } catch (e) {
    return { error: "Could not submit subscription invoice" }
  }

  return { invoiceId: invoice.remoteId }
}

export async function resetPayment(
  ctx: Context,
  { invoiceId }: ResetPaymentInput,
): Promise<PayMemberSubscriptionResult> {
  try {
    await ctx.prisma.subscriptionInvoice.deleteMany({
      where: { remoteId: invoiceId },
    })
  } catch (e) {
    logger.error({ message: "Error deleting invoice", invoiceId, error: JSON.stringify(e.meta) })
    return { error: "Error deleting invoice" }
  }
  return {}
}

export async function setSubscriptionPaid(prisma: PrismaClient, subscriptionId: string) {
  try {
    await prisma.memberSubscription.update({
      where: { id: subscriptionId },
      data: { recurring: true },
    })
  } catch (e) {
    return { success: false, error: "Could not pay subscription" }
  }
  return { success: true }
}

export async function activateMemberSubscription(
  ctx: Context,
  { subscriptionId }: ActivateMemberSubscriptionInput,
): Promise<ActivateMemberSubscriptionResult> {
  try {
    await ctx.prisma.memberSubscription.update({
      where: { id: subscriptionId },
      data: { recurring: true },
    })
  } catch (e) {
    return { success: false, error: "Could not activate subscription" }
  }
  return { success: true }
}

export async function cancelMemberSubscription(
  ctx: Context,
  { subscriptionId }: CancelMemberSubscriptionInput,
): Promise<CancelMemberSubscriptionResult> {
  try {
    await ctx.prisma.memberSubscription.update({
      where: { id: subscriptionId },
      data: { recurring: false },
    })
  } catch (e) {
    return { success: false, error: "Could not cancel subscription" }
  }

  return { success: true }
}

export async function switchSubscriptionOption(
  ctx: Context,
  { membershipId, subscriptionOptionId }: SwitchSubscriptionOptionInput,
): Promise<SwitchSubscriptionOptionResult> {
  let memberSubscription: MemberSubscription
  try {
    memberSubscription = await ctx.prisma.memberSubscription.findFirst({
      where: { groupMembershipId: membershipId },
    })
  } catch (e) {
    logger.error({ message: "MemberSubscription error", error: JSON.stringify(e.meta), membershipId, subscriptionOptionId })
    return { success: false, error: "Can't find member subscription" }
  }

  try {
    await ctx.prisma.memberSubscription.update({
      where: { id: memberSubscription.id },
      data: { groupSubscriptionId: subscriptionOptionId },
    })
    await ctx.prisma.subscriptionInvoice.deleteMany({
      where: {
        subscriptionId: memberSubscription.id,
        status: { in: [InvoiceStatus.NEW, InvoiceStatus.EXPIRED, InvoiceStatus.INVALID] },
      },
    })
  } catch (e) {
    logger.error({ message: "Change member subscription error", error: JSON.stringify(e.meta), membershipId, subscriptionOptionId })
    return { success: false, error: "Can't update member subscription" }
  }
  return { success: true }
}

export async function createOrGetMemberSubscription(
  ctx: Context, input: CreateMemberSubscriptionInput,
): Promise<MemberSubscription | null> {
  const { membershipId, groupId, subscriptionOptionId } = input

  let groupSubscription
  try {
    if (subscriptionOptionId) {
      groupSubscription = await ctx.prisma.groupSubscription.findUnique({
        where: { id: subscriptionOptionId },
      })
    } else {
      groupSubscription = await ctx.prisma.groupSubscription.findFirst({
        where: { groupId, active: true },
      })
    }
  } catch (e) {
    logger.error({ message: "Error getting groupSubscription", groupId, subscriptionOptionId })
  }

  if (!groupSubscription) {
    return null
  }

  let memberSubscription = await ctx.prisma.memberSubscription.findUnique({
    where: {
      MemberSubscription_groupMembershipId_groupSubscriptionId_key: {
        groupSubscriptionId: groupSubscription.id, groupMembershipId: membershipId,
      },
    },
  })

  if (memberSubscription) {
    return memberSubscription
  }

  try {
    memberSubscription = await ctx.prisma.memberSubscription.create({
      data: {
        groupSubscriptionId: groupSubscription.id,
        groupMembershipId: membershipId,
      },
    })
  } catch (e) {
    console.error(e)
    return null
  }

  logger.info({ message: "Created MemberSubscription", membershipId, subscriptionOptionId: groupSubscription.id, groupId })

  return memberSubscription
}

export async function pendingInvoice(ctx: Context, subscriptionId: string): Promise<SubscriptionInvoice | null> {
  try {
    return ctx.prisma.subscriptionInvoice.findFirst({
      where: { subscriptionId, status: { not: InvoiceStatus.COMPLETE } },
      orderBy: { createdAt: "desc" },
    })
  } catch (e) {
    logger.error({ message: "Error getting pending invoice", subscriptionId, error: JSON.stringify(e.meta) })
    return null
  }
}

export async function subscriptionIsActive(ctx: Context, subscriptionId: string): Promise<boolean> {
  const memberSubscription = await ctx.prisma.memberSubscription.findUnique({ where: { id: subscriptionId } })
  if (!memberSubscription) {
    return false
  }

  const now = new Date()

  const activeChecks = [
    memberSubscription.startDate && memberSubscription.startDate < now,
    memberSubscription.endDate && memberSubscription.endDate > now,
  ]

  return activeChecks.every(Boolean)
}

export async function getSubscriptionInvoices(ctx: Context, subscriptionId: string): Promise<SubscriptionInvoice[]> {
  return ctx.prisma.subscriptionInvoice.findMany({
    where: { subscriptionId },
  })
}

export async function updateSubscriptionDates(prisma: PrismaClient, input: UpdateSubscriptionDatesInput) {
  const { subscriptionId, startDate, endDate } = input

  let subscription: MemberSubscription
  try {
    subscription = await prisma.memberSubscription.findUnique({
      where: { id: subscriptionId },
    })
  } catch (e) {
    logger.error({ message: "Error getting memberSubscription", subscriptionId, error: JSON.stringify(e.meta) })
  }

  if (!subscription) {
    return
  }

  const updateData = {
    endDate,
  }

  if (!subscription.startDate) {
    updateData["startDate"] = startDate
  }

  try {
    await prisma.memberSubscription.update({
      where: { id: subscriptionId },
      data: updateData,
    })
  } catch (e) {
    logger.error({ message: "Error updating MemberSubscription", subscriptionId, updateData, error: JSON.stringify(e.meta) })
  }
}
