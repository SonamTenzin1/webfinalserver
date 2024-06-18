import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { hash, compare } from "bcrypt";
import { sign } from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const app = new Hono();
const prisma = new PrismaClient();

app.use("/*", cors());

// Signup route
app.post("/signup", async (c) => {
  try {
    const body = await c.req.json();

    // Validate email and password here if necessary
    if (!body.email || !body.password || !body.username) {
      throw new HTTPException(400, { message: "Missing required fields" });
    }

    const hashedPassword = await hash(body.password, 10); // Hash password with 10 salt rounds

    const user = await prisma.user.create({
      data: {
        email: body.email,
        hashedPassword,
        username: body.username,
      },
    });

    return c.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error occurred during user registration:", error);

    if (error instanceof HTTPException) {
      throw error; // Re-throw HTTPException with status code and message
    } else if ((error as any).code === "P2002") {
      return c.json({ message: "Email already exists" });
    } else {
      return c.json({ message: "Internal server error" });
    }
  }
});

// Login route
app.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true, hashedPassword: true },
    });

    if (!user) {
      throw new HTTPException(401, { message: "User not found" });
    }

    const match = await compare(body.password, user.hashedPassword);

    if (match) {
      const payload = {
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // Token expires in 1 hour
      };

      const secret = "mySecretKey"; // Replace with your actual secret key
      const token = sign(payload, secret);

      return c.json({ message: "Login successful", token });
    } else {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error occurred during login:", error);
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
});

// Get all posts sorted by createdAt descending
app.get("/feeds", async (c) => {
  try {
    const feeds = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });
    return c.json(feeds);
  } catch (error) {
    console.error("Error fetching feeds:", error);
    return c.json({ message: "Failed to fetch feeds" });
  }
});

// Like a post
app.post("/feeds/post/:id/like", async (c) => {
  const { id } = c.req.param();
  try {
    const post = await prisma.post.update({
      where: { id: Number(id) },
      data: { likes: { increment: 1 } },
    });
    return c.json(post);
  } catch (error) {
    console.error(`Error liking post with id ${id}:`, error);
    return c.json({ message: "Failed to like post" });
  }
});

// Get comments for a post
app.get("/feeds/post/:id/comments", async (c) => {
  const { id } = c.req.param();
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: Number(id) },
      orderBy: { createdAt: "desc" },
    });
    return c.json(comments);
  } catch (error) {
    console.error(`Error fetching comments for post with id ${id}:`, error);
    return c.json({ message: "Failed to fetch comments" });
  }
});

// Get user profile by username
app.get("/profile/:username", async (c) => {
  const { username } = c.req.param();
  try {
    const profile = await prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        following: true,
        followedBy: true,
        bio: true,
        Post: true, // Change 'posts' to 'Post'
      },
    });
    return c.json(profile);
  } catch (error) {
    console.error(`Error fetching profile for ${username}:`, error);
    return c.json({ message: "Failed to fetch profile" });
  }
});

// Get editable profile information by username
app.get("/profile/:username/editpf", async (c) => {
  const { username } = c.req.param();
  try {
    const editableProfile = await prisma.user.findUnique({
      where: { username },
      select: { username: true, bio: true },
    });
    return c.json(editableProfile);
  } catch (error) {
    console.error(`Error fetching editable profile for ${username}:`, error);
    return c.json({ message: "Failed to fetch editable profile" });
  }
});

// Update profile information by username
app.patch("/profile/:username/editpf", async (c) => {
  const { username } = c.req.param();
  try {
    const updatedProfile = await prisma.user.update({
      where: { username },
      data: {
        // Update fields as needed
      },
    });
    return c.json(updatedProfile);
  } catch (error) {
    console.error(`Error updating profile for ${username}:`, error);
    return c.json({ message: "Failed to update profile" });
  }
});

const port = 3000;
serve({
  fetch: app.fetch,
  port,
});
console.log(`Server is running on port ${port}`);
