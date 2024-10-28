// app/api/auth/login/route.js
import { PrismaClient } from '@prisma/client';
import {NextRequest} from "next/server";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const { firebaseUid, name, email } = await request.json();

  try {
    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { firebaseUid } });

    // Create new user if not exists
    if (!user) {
      user = await prisma.user.create({
        data: { firebaseUid, name, email },
      });
    }

    return new Response(JSON.stringify(user), { status: 200 });
  } catch (error) {
    console.error("Error saving user to the database:", error);
    return new Response(JSON.stringify({ message: 'Failed to save user' }), { status: 500 });
  }
}
