import { hash } from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return Response.json(
        { error: "Email is already registered." },
        { status: 409 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return Response.json(
      { message: "User created successfully." },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error.message || "Failed to register user." },
      { status: 500 }
    );
  }
}
