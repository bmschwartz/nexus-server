import jwt from "jsonwebtoken"
import * as dotenv from "dotenv"
import { Auth as AmplifyAuth } from "aws-amplify";

import { Context } from "../../context"
import { User } from "@prisma/client"
import { logger } from "../../logger";
import { getUser } from "../../repository/UserRepository";

dotenv.config()

export const UserQuery = {
  async me(parent: any, args: any, { prisma, userId }: Context) {
    if (!userId) {
      logger.info({ message: "Not logged in", userId })
      return new Error("Not logged in")
    }
    return getUser(prisma, userId)
  },

  async userIdByEmail(parent: any, args: any, ctx: Context) {
    const {
      input: { email },
    } = args

    try {
      const user = await ctx.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      })

      return user?.id

    } catch (e) {
      logger.info({ message: "Could not find user by email", email })
    }

    return null
  },
}

export const UserMutations = {
  async signupUser(parent: any, args: any, ctx: Context) {
    const {
      input: { email, username, password, userType },
    } = args

    const emailError = validateEmail(email)
    const usernameError = validateUsername(username)
    const userTypeError = validateUserType(userType)

    if (emailError) {
      logger.info({ message: "Sign Up Error", emailError })
      return { success: false, error: "Invalid email" }
    } else if (usernameError) {
      logger.info({ message: "Sign Up Error", usernameError })
      return { success: false, error: "Invalid username" }
    } else if (userTypeError) {
      logger.info({ message: "Sign Up Error", userTypeError })
      return { success: false, error: "Invalid user type" }
    }

    const userExists = await checkIfUserExists(ctx, email, username)
    if (userExists) {
      logger.info({ message: "User or email already exists", email, username })
      return { success: false, error: "Email or username already exists" }
    }

    let userSub
    try {
      const result = await AmplifyAuth.signUp({
        username: email, password, attributes: { email },
      })
      userSub = result.userSub
    } catch (e) {
      logger.info({ message: e.message, username, email })
      return { success: false, error: "Please contact support@tradenexus.io" }
    }

    let user: User

    try {
      user = await ctx.prisma.user.create({
        data: {
          id: userSub,
          email,
          userType,
          username,
        },
      })

      return { success: true }
    } catch (e) {
      logger.info({ message: "Sign Up Error", error: e })
    }

    return { success: false, error: "Signup Error" }
  },

  async verifySignUpCode(parent: any, args: any, ctx: Context) {
    const {
      input: { email, code },
    } = args

    const user = await ctx.prisma.user.findUnique({
      where: { email },
    })
    if (!user) {
      logger.info({ message: "Verify Code Error - User does not exist", email, code })
      return { token: null, error: "Invalid Email or Code" }
    }

    try {
      await AmplifyAuth.confirmSignUp(email, code)
    } catch (e) {
      logger.info({ message: "Amplify Error - Invalid registration code", email, code })
      return { token: null, error: "Invalid Email or Code" }
    }
    return {
      token: generateToken(user.id, user.userType),
    }
  },

  async loginUser(parent: any, args: any, ctx: Context) {
    const {
      input: { email, password },
    } = args

    const user = await ctx.prisma.user.findUnique({
      where: { email },
    })
    if (!user) {
      logger.info({ message: "Login Error - User does not exist", email })
      return { token: null, error: "Invalid email and password combination" }
    }

    try {
      await AmplifyAuth.signIn(email, password)
      return {
        token: generateToken(user.id, user.userType),
      }
    } catch (e) {
      logger.error({ message: "Login Error", error: e })
    }
    return { token: null }
  },
}

export const UserResolvers = {
  async memberships(user: any, args: any, ctx: Context) {
    return ctx.prisma.groupMembership.findMany({
      where: { memberId: ctx.userId },
    })
  },
}

const generateToken = (userId: string, userType: string) => {
  return jwt.sign(
    { userId, userType },
    String(process.env.APP_SECRET),
    { expiresIn: "24h" },
  )
}

const memberships = async (user: any, args: any, ctx: Context) => {
  return ctx.prisma.groupMembership.findMany({
    where: { memberId: ctx.userId },
  })
}

const validateEmail = (email: string) => {
  const regexp = new RegExp(
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  )
  if (!regexp.test(email)) {
    logger.info({ message: "Invalid email error", email })
    return new Error("Invalid email")
  }
  return null
}

const validateUsername = (username: string) => {
  const regex = /^(?=.{3,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/
  if (!regex.test(username)) {
    logger.info({ message: "Invalid username error", username })
    return new Error("Invalid username")
  }
  return null
}

const validateUserType = (userType: string) => {
  if (!["OWNER", "TRADER", "MEMBER"].includes(userType)) {
    return new Error("Invalid user type!")
  }
}

const checkIfUserExists = async (ctx: Context, email: string, username: string) => {
  let users: User[]
  try {
    users = await ctx.prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              equals: username,
              mode: "insensitive",
            },
          },
          {
            email: {
              equals: email,
              mode: "insensitive",
            },
          },
        ],
      },
    })
    if (users.length > 0) {
      return true
    }
  } catch (e) {
    return true
  }
  return false
}
