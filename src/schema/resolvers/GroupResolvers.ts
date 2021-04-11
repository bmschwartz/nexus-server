import { MembershipRole, MembershipStatus, PrismaClient } from "@prisma/client"
import { logger } from "../../logger"
import { Context } from "../../context"
import { getOrderSet } from "../../repository/OrderSetRepository"
import { getGroupMembers, getGroupOrderSets } from "../../repository/GroupRepository"

const GROUP_NAME_VALIDATION = {
  minLength: 1,
  maxLength: 30,
}

const MAX_GROUP_SUBSCRIPTION_OPTIONS = 10

interface GroupSubscriptionInput {
  fee: number
  duration: number
  description?: string | null
}

export const GroupQuery = {
  async myGroup(parent: any, args: any, ctx: Context) {
    const membership = await ctx.prisma.groupMembership.findFirst({
      where: { memberId: ctx.userId, role: { in: [MembershipRole.ADMIN, MembershipRole.TRADER] } },
      include: {
        group: {
          include: {
            subscriptionOptions: true,
          },
        },
      },
    })

    return membership ? membership["group"] : null
  },

  async allGroups(parent: any, args: any, ctx: Context) {
    return ctx.prisma.group.findMany()
  },

  async group(parent: any, args: any, ctx: Context) {
    const {
      input: { groupId },
    } = args
    return ctx.prisma.group.findUnique({ where: { id: groupId } })
  },
  async groupExists(parent: any, args: any, ctx: Context) {
    const {
      input: { name },
    } = args
    const groupCount = await ctx.prisma.group.count({
      where: {
        name: {
          equals: name.trim(),
          mode: "insensitive",
        },
      },
    })
    return groupCount > 0
  },
}

export const GroupMutations = {
  async createGroup(parent: any, args: any, ctx: Context) {
    const {
      input: {
        name,
        description,
        telegram,
        discord,
        email,
        subscriptionOptions,
        payInPlatform,
        payoutAddress,
      },
    } = args

    if (!ctx.userId) {
      return new Error("Unknown userId")
    }

    validateGroupName(name)
    validateGroupDescription(description)

    if (email) {
      validateEmail(email)
    }

    const existingGroup = await ctx.prisma.group.findUnique({ where: { name } })

    if (existingGroup) {
      return new Error("A group by that name already exists")
    }

    const owner = {
      active: true,
      memberId: ctx.userId,
      status: MembershipStatus.APPROVED,
      role: MembershipRole.ADMIN,
    }

    if (subscriptionOptions && subscriptionOptions.length > MAX_GROUP_SUBSCRIPTION_OPTIONS) {
      logger.error({ message: `Tried to create more than ${MAX_GROUP_SUBSCRIPTION_OPTIONS} subscription options` })
      throw new Error(`Maximum of ${MAX_GROUP_SUBSCRIPTION_OPTIONS} subscription options allowed`)
    }

    const groupSubscriptionOptions = subscriptionOptions.map(option => {
      return createSubscriptionOption(option)
    })

    return ctx.prisma.group.create({
      data: {
        name,
        description,
        email,
        telegram,
        discord,
        payInPlatform,
        payoutAddress,
        active: true,
        members: {
          create: owner,
        },
        subscriptionOptions: {
          create: groupSubscriptionOptions,
        },
      },
    })
  },

  async renameGroup(parent: any, args: any, ctx: Context) {
    const {
      input: { groupId },
    } = args
    const {
      input: { name: newName },
    } = args

    validateGroupName(newName)

    return ctx.prisma.group.update({
      where: { id: groupId },
      data: { name: newName },
    })
  },

  async updateGroupDescription(parent: any, args: any, ctx: Context) {
    const {
      input: { groupId },
    } = args
    const {
      input: { description },
    } = args

    validateGroupDescription(description)

    return ctx.prisma.group.update({
      where: { id: groupId },
      data: { description },
    })
  },

  async disableGroup(parent: any, args: any, ctx: Context) {
    const {
      input: { groupId },
    } = args

    return ctx.prisma.group.update({
      where: { id: groupId },
      data: { active: false },
    })
  },
}

function createSubscriptionOption(subscription: GroupSubscriptionInput) {
  const { fee, duration, description } = subscription
  let error = ""
  if (fee < 0) {
    error = "Attempting to create a subscription option with negative fee"
  } else if (duration < 1) {
    error = "Attempting to create a subscription option duration below 1"
  }

  if (error) {
    logger.error({ message: error })
    throw new Error(error)
  }

  return { active: true, price: fee, duration, description: description || "" }
}

export const GroupResolvers = {
  async orderSet(group: any, args: any, ctx: Context) {
    return getOrderSet(ctx, args.input.id)
  },

  async orderSets(group: any, { limit, offset }: any, ctx: Context) {
    return getGroupOrderSets(ctx, { limit, offset, groupId: group.id })
  },

  async symbolsWithPosition(group: any, args: any, ctx: Context) {
    // TODO This function...
    return {
      binance: [],
      bitmex: [],
    }
  },

  async members(group: any, args: any, ctx: Context) {
    const { id: groupId } = group
    const { input } = args

    const limit = input?.limit
    const offset = input?.offset
    const roles = input?.roles
    const statuses = input?.statuses

    return getGroupMembers(ctx, { groupId, limit, offset, roles, statuses })
  },

  subscriptionOptions(group: any, args: any, ctx: Context) {
    const { id: groupId } = group

    try {
      return ctx.prisma.groupSubscription.findMany({ where: { groupId } })
    } catch (e) {
      logger.error({
        error: JSON.stringify(e.meta),
        message: `Error getting subscription options for ${groupId}`,
      })
      throw e
    }
  },
}


export const validateGroupExists = async (
  prisma: PrismaClient,
  groupId: any,
) => {
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) {
    return new Error("That group does not exist")
  }
  return group
}

const validateGroupDescription = (description: string) => {
  if (
    description.length < GROUP_NAME_VALIDATION.minLength ||
    description.length > GROUP_NAME_VALIDATION.maxLength
  ) {
    return new Error(
      `Description can be at most ${GROUP_NAME_VALIDATION.maxLength} characters long`,
    )
  }
  return null
}
const validateGroupName = (name: string) => {
  if (
    name.length < GROUP_NAME_VALIDATION.minLength ||
    name.length > GROUP_NAME_VALIDATION.maxLength
  ) {
    return new Error(
      `Name must be between ${GROUP_NAME_VALIDATION.minLength} and ${GROUP_NAME_VALIDATION.maxLength} characters long`,
    )
  }
  return null
}

const validateEmail = (email: string) => {
  const regexp = new RegExp(
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  )
  if (!regexp.test(email)) {
    return new Error("Invalid email")
  }
  return null
}
