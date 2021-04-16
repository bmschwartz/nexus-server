import { and, or, rule } from "graphql-shield";
import { Context } from "../context";
import { isAuthenticated, isMembershipGroupOwner, isMembershipUser } from "./utils";

const hasMembershipAccessFromArgs = rule({ cache: "strict" })((parent, args, ctx: Context, info) => {
  const { membershipId } = args.input
  return isMembershipUser(ctx, membershipId)
})

const isExchangeAccountOwnerFromArgs = rule({ cache: "strict" })(async (parent, args, ctx: Context, info) => {
  const { id: exchangeAccountId } = args.input
  return true
})

const isExchangeAccountOwnerFromParent = rule({ cache: "strict" })((parent, args, ctx: Context, info) => {
  return true
})

const hasExchangeAccountAccessFromArgs = rule({ cache: "strict" })(async (parent, args, ctx: Context, info) => {
  const { id: membershipId } = args.input
  return true
})

const isMembershipGroupOwnerFromArgs = rule({ cache: "strict" })(async (parent, args, ctx: Context, info) => {
  const { id: membershipId } = args.input
  return isMembershipGroupOwner(ctx, membershipId)
})

const isExchangeAccountGroupOwnerFromArgs = rule({ cache: "strict" })(async (parent, args, ctx: Context, info) => {
  const { id: exchangeAccountId } = args.input

  // const { groupId: userGroupId, role, status } = tokenData
  // const validRoles = ["TRADER", "OWNER"]
  // if (!userGroupId || !validRoles.includes(role) || status !== "APPROVED") {
  //   return false
  // }
  //
  // const exchangeAccount = await getExchangeAccount(ctx, exchangeAccountId)
  return true
})

const isExchangeAccountGroupOwnerFromParent = rule({ cache: "strict" })(async (parent, args, ctx: Context, info) => {
  const { membershipId: userMembershipId } = parent
  return true
})

export const ExchangeAccountPermissions = {
  "*": isAuthenticated,
}

export const ExchangeAccountQueryPermissions = {
  exchangeAccount: and(isAuthenticated, or(isExchangeAccountOwnerFromArgs, isExchangeAccountGroupOwnerFromArgs)),
  exchangeAccounts: and(isAuthenticated, or(hasMembershipAccessFromArgs, isMembershipGroupOwnerFromArgs)),
}

export const ExchangeAccountMutationPermissions = {
  createExchangeAccount: and(isAuthenticated, hasMembershipAccessFromArgs),
  deleteExchangeAccount: and(isAuthenticated, hasExchangeAccountAccessFromArgs),
  updateExchangeAccount: and(isAuthenticated, hasExchangeAccountAccessFromArgs),
  toggleExchangeAccountActive: and(isAuthenticated, hasExchangeAccountAccessFromArgs),
}
