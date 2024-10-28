import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";

export async function POST(request: NextRequest, context: { params: Promise<{ crowdId: string }> }
) {
    const crowdId = (await context.params).crowdId;
    
    const token = request.headers.get('Authorization')?.split(' ')[1];
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
            where: { firebaseUid: decodedToken.uid }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check if user is the creator
        const crowd = await prisma.crowd.findFirst({
            where: { 
                id: crowdId,
                creatorId: user.id
            }
        });

        if (crowd) {
            return NextResponse.json({ error: 'Creator cannot leave crowd' }, { status: 403 });
        }

        // Remove user from crowd
        await prisma.$transaction([
            prisma.crowdUserProfile.deleteMany({
                where: {
                    crowdId,
                    userId: user.id
                }
            }),
            prisma.crowd.update({
                where: { id: crowdId },
                data: {
                    users: {
                        disconnect: { id: user.id }
                    }
                }
            })
        ]);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to leave crowd' }, { status: 500 });
    }
}
