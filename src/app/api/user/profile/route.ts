import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";

export async function GET(request: NextRequest) {
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
            where: { firebaseUid: decodedToken.uid },
            include: {
                CrowdUserProfiles: {
                    include: {
                        crowd: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ user }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }
}
