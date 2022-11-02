import "reflect-metadata";
import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import microConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import * as redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();
  app.set("trust proxy", process.env.NODE_ENV !== "production");
  app.set("Access-Control-Allow-Origin", "https://studio.apollographql.com");
  app.set("Access-Control-Allow-Credentials", true);
  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();
  const cors = {
    origin: "https://studio.apollographql.com",
    credentials: true,
  };
 
  app.use(
    session({
      name: "qid",
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        secure: true, // cookie only works in https
        sameSite: "none", // csrf
      },
      saveUninitialized: false,
      secret: "acJe193c9uY&yBns",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ em: orm.em, req, res }),
  });
  // need to await this because middleware is async
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors });

  app.listen(4000, () => {
    console.log(" 🚀 ~ server started on localhost: 4000");
  });
};

main().catch((err) => {
  console.error(err);
});
