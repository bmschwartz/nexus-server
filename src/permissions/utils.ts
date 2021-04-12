import { rule } from "graphql-shield";
import { MembershipRole, MembershipStatus } from "@prisma/client"

import { logger } from "../logger";
import { Context } from "../context";
import {
  getMembership,
  validateActiveUserHasRoleAndStatus,
} from "../repository/GroupMembershipRepository";
import { membershipForSubscription } from "../repository/MemberSubscriptionRepository";
import { membershipForInvoice } from "../repository/SubscriptionInvoiceRepository";

export const isAuthenticated = rule()((parent, args, { userId }) => {
  return !!userId
})

export const isMembershipGroupOwner = async (membershipId, args, ctx: Context, info) => {
  let groupId: string
  try {
    const membership = await getMembership(ctx.prisma, membershipId)
    if (!membership) {
      return false
    }
    groupId = membership.groupId
  } catch (e) {
    logger.error({ message: "[isMembershipGroupOwner] Error", userId: ctx.userId, membershipId, e })
    return false
  }

  return await validateActiveUserHasRoleAndStatus(
    ctx.prisma,
    ctx.userId,
    groupId,
    MembershipRole.ADMIN,
    MembershipStatus.APPROVED,
  )
}

export const isMembershipUser = async (membershipId, args, ctx: Context, info) => {
  let membership

  try {
    membership = await getMembership(ctx.prisma, membershipId)
  } catch (e) {
    logger.error({ message: "[isMembershipUser] Error", userId: ctx.userId, membershipId, e })
  }

  return membership && membership.memberId === ctx.userId
}

export const isGroupAdmin = async (groupId, args, ctx: Context, info) => {
  try {
    return await validateActiveUserHasRoleAndStatus(
      ctx.prisma,
      ctx.userId,
      groupId,
      MembershipRole.ADMIN,
      MembershipStatus.APPROVED,
    )
  } catch (e) {
    logger.error({ message: "[isGroupAdmin] Error", userId: ctx.userId, groupId, e })
  }

  return false
}

export const isGroupTrader = async (groupId, args, ctx: Context, info) => {
  const error = await validateActiveUserHasRoleAndStatus(
    ctx.prisma,
    ctx.userId,
    groupId,
    MembershipRole.TRADER,
    MembershipStatus.APPROVED,
  )

  return error || true
}

export const isGroupMember = async (groupId, args, ctx: Context, info) => {
  const error = await validateActiveUserHasRoleAndStatus(
    ctx.prisma,
    ctx.userId,
    groupId,
    MembershipRole.MEMBER,
    MembershipStatus.APPROVED,
  )

  return error || true
}

export const isSubscriptionUser = async (ctx: Context, subscriptionId) => {
  const membership = await membershipForSubscription(ctx, subscriptionId)
  if (!membership) {
    return false
  }
  return membership.memberId === ctx.userId
}

export const isSubscriptionInvoiceOwner = async (invoiceId, ctx: Context) => {
  const groupMembership = await membershipForInvoice(ctx, invoiceId)
  if (!groupMembership) {
    return false
  }
  return groupMembership.memberId === ctx.userId
}
