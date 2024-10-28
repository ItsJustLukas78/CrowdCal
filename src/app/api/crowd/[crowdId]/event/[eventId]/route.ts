import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";
import { Event } from "@/types";

export async function DELETE(request: NextRequest, context: { params: { crowdId: string, eventId: string } }) {
  const eventId = context.params.eventId;
  const crowdId = context.params.crowdId;

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
  }

  if (!crowdId) {
    return NextResponse.json({ error: 'Crowd ID is required' }, { status: 400 });
  }

  const token: string | undefined = request.headers.get('Authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let decodedToken: admin.auth.DecodedIdToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const crowdUserProfile = await prisma.crowdUserProfile.findFirst({
      where: {
        crowdId,
        userId: user.id,
      },
    });

    if (!crowdUserProfile) {
      return NextResponse.json({ error: 'User not found in crowd' }, { status: 404 });
    }

    const deletedEvent = await prisma.event.delete({
      where: {
        id: eventId,
        creatorProfileId: crowdUserProfile.id,
      },
    });

    return NextResponse.json({ success: true, deletedEvent }, { status: 200 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}