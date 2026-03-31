import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/helpers";
import Contact from "@/models/Contact";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const contacts = await Contact.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({ contacts }, { status: 200 });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const phone = normalizePhoneNumber(body?.phone);
  const chatId = String(body?.chatId || "").trim();
  const name = String(body?.name || "").trim();

  if (!phone || !chatId) {
    return Response.json(
      { error: "phone and chatId are required." },
      { status: 400 }
    );
  }

  await connectDB();

  await Contact.findOneAndUpdate(
    { userId: session.user.id, phone },
    {
      $set: {
        name,
        chatId,
      },
    },
    { upsert: true, new: true }
  );

  const contacts = await Contact.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({ contacts }, { status: 200 });
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const contactId = String(body?.contactId || "").trim();

  if (!contactId) {
    return Response.json({ error: "contactId is required." }, { status: 400 });
  }

  await connectDB();

  await Contact.deleteOne({ _id: contactId, userId: session.user.id });

  const contacts = await Contact.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({ contacts }, { status: 200 });
}
