import {
  isAuthenticated,
  isGroupAdmin,
  isGroupMember,
  isGroupTrader,
  isMembershipGroupOwner,
  isMembershipUser,
} from "./utils";
import { and, or, rule } from "graphql-shield";
import { Context } from "../context";

const membershipUserFromParent = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    if (!parent?.id) {
      return false
    }
    return isMembershipUser(ctx, parent.id)
  },
)

const membershipUserFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    if (!args?.input?.membershipId) {
      return false
    }
    return isMembershipUser(ctx, args.input.membershipId)
  },
)

const membershipGroupOwnerFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    if (!args?.input?.membershipId) {
      return false
    }
    return isMembershipGroupOwner(ctx, args.input.membershipId)
  },
)

const membershipGroupOwnerFromParent = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    if (!parent?.id) {
      return false
    }
    return isMembershipGroupOwner(ctx, parent.id)
  },
)

const groupMemberFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    if (!args?.input?.groupId) {
      return false
    }
    return isGroupMember(ctx, args.input.groupId)
  },
)

const groupAdminFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    if (!args?.input?.groupId) {
      return false
    }
    return isGroupAdmin(ctx, args.input.groupId)
  },
)

const groupTraderFromArgs = rule({ cache: "strict" })(
  async (parent, args, ctx: Context, info) => {
    if (!args?.input?.groupId) {
      return false
    }
    return isGroupTrader(ctx, args.input.groupId)
  },
)

export const GroupMembershipQueryPermissions = {
  myMembership: and(isAuthenticated, groupMemberFromArgs),
  myMemberships: isAuthenticated,
  membershipRequests: and(isAuthenticated, groupAdminFromArgs),
  groupMembers: and(isAuthenticated, or(groupAdminFromArgs, groupTraderFromArgs)),
  membership: and(
    isAuthenticated,
    or(
      groupMemberFromArgs,
      membershipUserFromArgs,
      membershipUserFromParent,
      membershipGroupOwnerFromArgs,
    ),
  ),
}

export const GroupMembershipMutationPermissions = {
  joinGroup: isAuthenticated,
  createMembership: and(isAuthenticated, groupAdminFromArgs),
  updateMembershipRole: and(isAuthenticated, groupAdminFromArgs),
  updateMembershipStatus: and(isAuthenticated, groupAdminFromArgs),
  updateMembershipActive: and(isAuthenticated, groupAdminFromArgs),
  deleteMembership: and(isAuthenticated, groupAdminFromArgs),
}

export const GroupMembershipPermissions = {
  "*": and(isAuthenticated, or(membershipGroupOwnerFromParent, membershipUserFromParent)),
}
