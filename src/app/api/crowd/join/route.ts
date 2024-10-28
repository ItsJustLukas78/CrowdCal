import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";

export async function POST(request: NextRequest) {
    const { code } = await request.json();
    
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
        const crowd = await prisma.crowd.findFirst({
            where: { code }
        });

        if (!crowd) {
            return NextResponse.json({ error: 'Invalid join code' }, { status: 404 });
        }

        const user = await prisma.user.findUnique({
            where: { firebaseUid: decodedToken.uid }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Check email domain restriction if it exists
        if (crowd.emailDomain) {
            const userEmailDomain = user.email.split('@')[1];
            if (userEmailDomain !== crowd.emailDomain) {
                return NextResponse.json({ error: 'Email domain not allowed' }, { status: 403 });
            }
        }

        // Add user to crowd
        await prisma.crowd.update({
            where: { id: crowd.id },
            data: {
                users: {
                    connect: { id: user.id }
                }
            }
        });

        // Create crowd user profile
        const crowdUserProfile = await prisma.crowdUserProfile.create({
            data: {
                crowdId: crowd.id,
                userId: user.id,
                upvotes: 0,
                downvotes: 0
            }
        });

        return NextResponse.json({ crowd, crowdUserProfile }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to join crowd' }, { status: 500 });
    }
}
