import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";

const app = new Hono();
const prisma = new PrismaClient();

app.get("/auth", (c) => {
  return c.text("Hello Hono!");
});
// this is for latest post to be at top
app.get("/feeds", async (c) => {
  const feeds = await prisma.post.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });
  return c.json(feeds);
});

// like count 
app.post("/post/:id/like", async (c) => {
  const { id } = c.req.param();
  const post = await prisma.post.update({
    where: { id: Number(id) },
    data: {
      likes: {
        increment: 1
      }
    }
  });
  return c.json(post);
});

//  comment
app.get("/post/:id/comments", async (c) => {
  const { id } = c.req.param();
  const comments = await prisma.comment.findMany({
    where: {
      postId: Number(id),
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  return c.json(comments);
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

// app.patch("profile/:username/editpf", (c) => {

  
// })

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

// commited by dupchu 