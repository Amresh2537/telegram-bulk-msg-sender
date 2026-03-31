import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Campaign from "@/models/Campaign";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const campaigns = await Campaign.find({ userId: session.user.id })
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();

  return Response.json({ campaigns }, { status: 200 });
}
