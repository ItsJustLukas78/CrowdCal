import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";

// Get single crowd details
export async function GET(
    request: NextRequest,
    { params }: { params: { crowdId: string } }
) {
    const crowdId = params.crowdId;
    
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
        const crowd = await prisma.crowd.findUnique({
            where: { id: crowdId },
            include: {
                CrowdUserProfiles: true,
                events: {
                    orderBy: { start: 'desc' },
                    take: 5 // Get latest 5 events
                }
            }
        });

        if (!crowd) {
            return NextResponse.json({ error: 'Crowd not found' }, { status: 404 });
        }

        return NextResponse.json({ crowd }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch crowd details' }, { status: 500 });
    }
}

// Update crowd details
export async function PATCH(
    request: NextRequest,
    { params }: { params: { crowdId: string } }
) {
    const crowdId = params.crowdId;
    const { name, description, code, emailDomain } = await request.json();
    
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

        const crowd = await prisma.crowd.findFirst({
            where: {
                id: crowdId,
                creatorId: user.id
            }
        });

        if (!crowd) {
            return NextResponse.json({ error: 'Unauthorized or crowd not found' }, { status: 404 });
        }

        const updatedCrowd = await prisma.crowd.update({
            where: { id: crowdId },
            data: {
                name: name || undefined,
                description: description || undefined,
            }
        });

        return NextResponse.json({ crowd: updatedCrowd }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to update crowd' }, { status: 500 });
    }
}
