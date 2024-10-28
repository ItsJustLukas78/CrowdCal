import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import {admin} from "@/lib/firebase/firebase-admin";
import {Crowd as PrismaCrowd, CrowdUserProfile as PrismaCrowdUserProfile} from "@prisma/client";
import {Crowd, Event} from "@/types";

// Function to generate a random code
function generateJoinCode(length: number = 6): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
}

// Function to get a unique join code
async function getUniqueJoinCode(): Promise<string> {
    let code = generateJoinCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        // Check if code exists
        const existingCrowd = await prisma.crowd.findFirst({
            where: { code }
        });

        if (!existingCrowd) {
            return code;
        }

        // Generate a new code
        code = generateJoinCode();
        attempts++;
    }

    throw new Error('Unable to generate unique join code');
}

export async function POST(request: NextRequest) {
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
        const { name, description, emailDomain } = await request.json();

        const user = await prisma.user.findUnique({
            where: { firebaseUid: decodedToken.uid }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate a unique join code
        const code = await getUniqueJoinCode();

        const crowd = await prisma.crowd.create({
            data: {
                name,
                description,
                code,  // Always create with an auto-generated code
                emailDomain,
                creatorId: user.id,
                users: {
                    connect: { id: user.id }
                }
            }
        });

        // Create crowd user profile for creator
        await prisma.crowdUserProfile.create({
            data: {
                crowdId: crowd.id,
                userId: user.id,
                upvotes: 0,
                downvotes: 0
            }
        });

        return NextResponse.json({ crowd }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to create crowd' }, { status: 500 });
    }
}

export async function DELETE(
  request: NextRequest
) {
    const data = await request.json();
    const {
        id
    } = data;

    const token: string | undefined = request.headers.get('Authorization')?.split(' ')[1];

    if (!token) {
        console.log('No token');
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    let decodedToken: admin.auth.DecodedIdToken;

    try {
        decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
        console.error('Error verifying token:', error);
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    try {
        const user = await prisma.user.findUnique({
            where: {firebaseUid: decodedToken.uid}
        });

        if (!user) {
            return NextResponse.json({error: 'User not found'}, {status: 404});
        }

        const crowd: PrismaCrowd | null = await prisma.crowd.findFirst({
            where: {
                id,
                creatorId: user.id
            }
        });

        if (!crowd) {
            return NextResponse.json({error: 'Crowd not found'}, {status: 404});
        }

        await prisma.crowd.delete({
            where: {
                id,
                creatorId: user.id
            }
        });

        return NextResponse.json({success: true}, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
            }
        })
    } catch (e) {
        console.error(e);
        return NextResponse.json({error: 'An error occurred while processing your request'}, {status: 500});
    }
}
