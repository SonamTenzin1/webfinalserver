import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { decode, sign, verify } from "hono/jwt";
import { jwt } from "hono/jwt";
import type { JwtVariables } from "hono/jwt";
import { PrismaClient } from "@prisma/client";
import  PrismaClientKnownRequestError  from '@prisma/client';


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

    // Validate email and password here if necessary

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

    // Additional logic or response handling if needed

    // Return success response
    return c.json({ message: "User registered successfully" });
  } catch (error) {
    // Handle errors
    console.error("Error occurred during user registration:", error);
    
    if (error instanceof Error && (error as any).code === "P2002") {
      console.log("There is a unique constraint violation, a new user cannot be created with this email");
      return c.json({ message: "Email already exists" });
    } else {
      // Return generic error response
      return c.json({ message: "Internal server error" });
    }
  }
});


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

// endpoint for profile

app.get("/profile/:username", async (c) => {
  const { username } = c.req.param();
  const profile = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      username: true,
      following: true,
      followers: true,
      bio: true,
      Post: true,
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
  });
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
  });
  return c.json(following);
});

app.patch("profile/:username/editpf", async (c) => {
  const { username } = c.req.param();
  const updatedProfile = await prisma.user.update({
    where: {
      username,
    },
    data: {},
  });
  return c.json(updatedProfile);
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
