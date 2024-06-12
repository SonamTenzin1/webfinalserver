import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";

const app = new Hono();
const prisma = new PrismaClient();

app.get("/auth", (c) => {
  return c.text("Hello Hono!");
});

app.get("/profile/:username", (c) => {
  const { username } = c.req.param();
  const profile = prisma.user.findUnique({
    where: {
      username,
    },
  });
  return c.json(profile);
});

app.get("/profile/:username/followers", (c) => {
  const { username } = c.req.param();
  const followers = prisma.user
    .findUnique({
      where: {
        username,
      },
    })
    .followers();
  return c.json(followers);
});

app.get("/profile/:username/following", (c) => {
  const { username } = c.req.param();
  const followers = prisma.user
    .findUnique({
      where: {
        username,
      },
    })
    .following();
  return c.json(followers);
});

app.patch("profile/:username/editpf", (c) => {
  
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
