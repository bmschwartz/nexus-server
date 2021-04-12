import bodyParser from "body-parser";
import express, { Request, Response } from "express"
import { ApolloServer, makeExecutableSchema } from "apollo-server-express"
import { applyMiddleware } from "graphql-middleware"
import Amplify, { Auth as AmplifyAuth } from "aws-amplify"

import { typeDefs } from "./schema/types"
import { resolvers } from "./schema/resolvers"
import { createContext } from "./context"
import { permissions } from "./permissions"
import { logger } from "./logger";
import { awsExports } from "./aws-exports"
import { bootstrap } from "./bootstrap";

Amplify.configure(awsExports)
AmplifyAuth.configure(awsExports)

const app = express()
app.use(bodyParser.json())

const graphVariant = process.env.APOLLO_GRAPH_VARIANT || "current"

const server = new ApolloServer({
  schema: applyMiddleware(
    makeExecutableSchema({ typeDefs, resolvers }),
    permissions,
  ),
  engine: {
    graphVariant,
  },
  context: createContext,
  introspection: true,
})

server.applyMiddleware({ app })

app.post("/payments", async (req: Request, res: Response) => {
  const { id: invoiceId } = req.body
  // const webhookSig = req.header("btcpay-sig")
  //
  // const bodyHmac = crypto.createHmac("sha256", process.env.BTCPAY_WEBHOOK_SECRET)
  //   .update(new Buffer(req.body.toString()))
  //   .digest("hex")
  //
  // if (bodyHmac !== webhookSig) {
  //   console.error("Could not verify webhook data")
  //   return res.sendStatus(200)
  // }
  if (!invoiceId) {
    return res.sendStatus(200)
  }

  const ctx = createContext({ req })
  await ctx.billing.refreshInvoiceData(ctx.prisma, invoiceId)

  return res.sendStatus(200)
})

app.listen({ port: 4000 }, () => {
  logger.info({ message: `🚀 Server ready` })
  bootstrap()
})
