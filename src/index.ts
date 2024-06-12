import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client';

const app = new Hono()
const prisma = new PrismaClient();

app.get('/auth', (c) => {
  return c.text('Hello Hono!')
})

app.get('/profile/:username', (c) => {
  const { username } = c.req.param();
  const profile = prisma.profile.findUnique({
    where: {
      username,
      following: {},
      followers: {},
      posts: {
        include: {
          likes: {
            include: {
              user: true
            }
          },
          comments: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });
  return c.json(profile);
})
const port = 3000
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
