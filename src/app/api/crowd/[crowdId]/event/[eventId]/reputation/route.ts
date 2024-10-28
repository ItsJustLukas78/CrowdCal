import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";

enum VoteType {
    UPVOTE = "UPVOTE",
    DOWNVOTE = "DOWNVOTE"
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ crowdId: string, eventId: string }> }) {
    const eventId = (await context.params).eventId;
    const crowdId = (await context.params).crowdId;
    const data = await request.json();
    const { voteType } = data;

    console.log(voteType, eventId, crowdId);

    const token = request.headers.get('Authorization')?.split(' ')[1];

    if (!eventId || !crowdId || !token) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);

        const user = await prisma.user.findUnique({
            where: { firebaseUid: decodedToken.uid }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const crowdUserProfile = await prisma.crowdUserProfile.findFirst({
            where: { crowdId, userId: user.id }
        });

        const event = await prisma.event.findFirst({
            where: { id: eventId, crowdId },
            select: {
                id: true,
                creatorProfileId: true,
                upvotes: true,
                downvotes: true
            }
        });

        if (!crowdUserProfile || !event) {
            return NextResponse.json({ error: 'User or event not found' }, { status: 404 });
        }

        const existingVote = await prisma.vote.findUnique({
            where: { userId_eventId: { userId: user.id, eventId } },
        });

        let upvoteChange: number = 0;
        let downvoteChange: number = 0;

        // Calculate vote changes
        if (!existingVote) {
            // New vote
            if (voteType === VoteType.UPVOTE) {
                upvoteChange = 1;
            } else {
                downvoteChange = 1;
            }
        } else if (existingVote.voteType === voteType) {
            // Remove existing vote
            if (voteType === VoteType.UPVOTE) {
                upvoteChange = -1;
            } else {
                downvoteChange = -1;
            }
        } else {
            // Change vote type
            if (voteType === VoteType.UPVOTE) {
                upvoteChange = 1;
                downvoteChange = -1;
            } else {
                upvoteChange = -1;
                downvoteChange = 1;
            }
        }

        // Validate final vote counts won't go negative
        const finalUpvotes = Math.max(0, event.upvotes + upvoteChange);
        const finalDownvotes = Math.max(0, event.downvotes + downvoteChange);

        // Use transaction to ensure atomic updates
        await prisma.$transaction(async (tx) => {
            // Update vote record
            if (!existingVote) {
                await tx.vote.create({
                    data: {
                        userId: user.id,
                        eventId,
                        voteType,
                    },
                });
            } else if (existingVote.voteType === voteType) {
                await tx.vote.delete({
                    where: { userId_eventId: { userId: user.id, eventId } },
                });
            } else {
                await tx.vote.update({
                    where: { userId_eventId: { userId: user.id, eventId } },
                    data: { voteType },
                });
            }

            // Update event counts
            await tx.event.update({
                where: { id: eventId },
                data: {
                    upvotes: finalUpvotes,
                    downvotes: finalDownvotes,
                },
            });

            // Update creator profile counts
            await tx.crowdUserProfile.update({
                where: { id: event.creatorProfileId },
                data: {
                    upvotes: finalUpvotes,
                    downvotes: finalDownvotes,
                },
            });
        });

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to interact with event' }, { status: 500 });
    }
}
