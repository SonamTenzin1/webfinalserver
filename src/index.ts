import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";

const app = new Hono();
const prisma = new PrismaClient();



app.get("/auth", (c) => {
  return c.text("Hello Hono!");
});

// endpoint for profile 

app.get("/profile/:username", async (c) => {
  const { username } = c.req.param();
  const profile = await prisma.user.findUnique({
    where: {
      username,
    },
    select:{
      username: true,
      following: true,
      followers: true,
      bio: true,
      Post: true
    },

  });
  return c.json(profile);
});

// endpoint for followers on profile
app.get("/profile/:username/followers", async (c) => {
  const { username } = c.req.param();
  const followers = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {  
      followers: true,  
    },
  })
  return c.json(followers);
});
// endpoint for following on profile
app.get("/profile/:username/following", async (c) => {
  const { username } = c.req.param();
  const following = await prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        following: true,
      },
    })
  return c.json(following);
});

app.patch("profile/:username/editpf", async (c) => {
  const { username } = c.req.param();
  const updatedProfile = await prisma.user.update({
    where: {
      username,
    },
    data: {

    },
  });
  return c.json(updatedProfile);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
