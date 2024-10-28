import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";


enum VoteType {
  UPVOTE="UPVOTE",
  DOWNVOTE="DOWNVOTE"
}


export async function PATCH(
      request: NextRequest,
  { params }: { params: { crowdId: string, eventId: string } }){

  const eventId = params.eventId;
  const crowdId = params.crowdId;
  const data = await request.json();
  const { voteType } = data;

  const token = request.headers.get('Authorization')?.split(' ')[1];

  if (!eventId || !crowdId || !token) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const crowdUserProfile = await prisma.crowdUserProfile.findFirst({
        where: { crowdId, userId: decodedToken.uid },
    });
    const event = await prisma.event.findFirst({
        where: { id: eventId, crowdId },
    });

    if (!crowdUserProfile || !event) {
        return NextResponse.json({ error: 'User or event not found' }, { status: 404 });
    }

    const existingVote = await prisma.vote.findUnique({
        where: { userId_eventId: { userId: decodedToken.uid, eventId } },
    });

    let upvoteChange: number = 0;
    let downvoteChange: number = 0;

    if (!existingVote) {
        // New vote
        if (voteType === VoteType.UPVOTE) {
            upvoteChange = 1;
        } else {
            downvoteChange = 1;
        }
    } else {
      // Existing vote
      if (existingVote.voteType === voteType) {
        if (voteType === VoteType.UPVOTE) {
            upvoteChange = -1;
        } else {
            downvoteChange = -1;
        }
        await prisma.vote.delete({ where: { userId_eventId: { userId: decodedToken.uid, eventId } } });
      } else {
          // Change vote
        if (voteType === VoteType.UPVOTE) {
            upvoteChange = 1;
            downvoteChange = -1;
        } else {
            downvoteChange = 1;
            upvoteChange = -1;
        }
        await prisma.vote.update({
            where: { userId_eventId: { userId: decodedToken.uid, eventId } },
            data: { voteType },
        });
      }
    }

    const transactionOperations: any = [
      prisma.event.update({
        where: { id: eventId },
        data: {
          upvotes: { increment: upvoteChange },
          downvotes: { increment: downvoteChange },
        },
      }),
      prisma.crowdUserProfile.update({
        where: { id: event.creatorProfileId },
        data: {
          upvotes: { increment: upvoteChange },
          downvotes: { increment: downvoteChange },
        },
      }),
    ];

    // Only add the create operation if there is no existing vote
    if (!existingVote) {
      transactionOperations.push(
        prisma.vote.create({
          data: {
            userId: decodedToken.uid,
            eventId,
            voteType,
          },
        })
      );
    }

    await prisma.$transaction(transactionOperations);

    return NextResponse.json({ success: true }, { status: 200 });

} catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to interact with event' }, { status: 500 });
}}