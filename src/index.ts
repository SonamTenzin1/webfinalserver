import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { decode, sign, verify } from "hono/jwt";
import { jwt } from "hono/jwt";
import type { JwtVariables } from "hono/jwt";
import { PrismaClient } from "@prisma/client";

const app = new Hono();
const prisma = new PrismaClient();

type Variables = JwtVariables;

app.use("/*", cors());

app.use(
  "/protected/*",
  jwt({
    secret: "mySecretKey",
  })
);

// registration route
app.post("/register", async (c) => {
  try {
    const body = await c.req.json();

    const bcryptHash = await Bun.password.hash(body.password, {
      algorithm: "bcrypt",
      cost: 4, // number between 4-31
    });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        hashedPassword: bcryptHash,
      },
    });

    try {
      // code omitted for brevity
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e instanceof prisma.PrismaClientKnownRequestError) {
          // The .code property can be accessed in a type-safe manner
          if ((e as PrismaClientKnownRequestError).code === "P2002") {
            console.log(
              "There is a unique constraint violation, a new user cannot be created with this email"
            );
            return c.json({ message: "Email already exists" });
          }
        }
      }
    }
  } catch (error) {
    // Handle error here
    console.error(error);
    return c.json({ message: "Internal server error" });
  }

  // login route
  app.post("/login", async (c) => {
    try {
      const body = await c.req.json();
      const user = await prisma.user.findUnique({
        where: { email: body.email },
        select: { id: true, hashedPassword: true },
      });

      if (!user) {
        return c.json({ message: "User not found" });
      }

      const match = await Bun.password.verify(
        body.password,
        user.hashedPassword,
        "bcrypt"
      );
      if (match) {
        const payload = {
          sub: user.id,
          exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 60 minutes
        };
        const secret = "mySecretKey";
        const token = await sign(payload, secret);
        return c.json({ message: "Login successful", token: token });
      } else {
        throw new HTTPException(401, { message: "Invalid credentials" });
      }
    } catch (error) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }
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
