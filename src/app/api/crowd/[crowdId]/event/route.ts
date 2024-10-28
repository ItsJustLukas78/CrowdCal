import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";
import { Event } from "@/types";

export async function POST(request: NextRequest, context: { params: Promise<{ crowdId: string }> }) {
  const crowdId = (await context.params).crowdId;
  const data = await request.json();

  const { title, start, end, description, location} = data as Event;

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

    const userReputation = crowdUserProfile.upvotes - crowdUserProfile.downvotes;

    const scaleFactor = userReputation > 0 ? 3 : 2.5;

    const postReputation = userReputation == 0 ? 0 : Math.floor(Math.log10(userReputation) * scaleFactor);

    const createdEvent = await prisma.event.create({
      data: {
        title,
        start: new Date(start),
        end: new Date(end),
        description,
        location,
        upvotes: userReputation > 0 ? postReputation : 0,
        downvotes: userReputation < 0 ? postReputation : 0,
        crowdId,
        creatorProfileId: crowdUserProfile.id,
      },
    });

    return NextResponse.json({ event: createdEvent }, { status: 201 });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("id")
  const crowdId = request.nextUrl.searchParams.get("crowdId")

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