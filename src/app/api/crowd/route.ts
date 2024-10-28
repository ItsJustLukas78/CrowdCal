import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import {admin} from "@/lib/firebase/firebase-admin";
import {Crowd as PrismaCrowd, CrowdUserProfile as PrismaCrowdUserProfile} from "@prisma/client";
import {Crowd, Event} from "@/types";

type NewCrowd = Omit<Crowd, 'id' | 'events' | 'CrowdUserProfiles' | 'creatorId'>;

export async function POST(
  request: NextRequest
) {
    const data = await request.json();
    const {
        name,
        description,
        code,
        emailDomain
    }: NewCrowd = data;

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
        const createdCrowd: PrismaCrowd = await prisma.crowd.create({
          data: {
            name,
            description,
            code,
            emailDomain,
            creatorId: decodedToken.uid,
            users: {
                connect: {
                    id: decodedToken.uid
                }
            }
          },
        });

        const crowdUserProfile: PrismaCrowdUserProfile = await prisma.crowdUserProfile.create({
          data: {
            crowdId: createdCrowd.id,
            userId: decodedToken.uid,
            upvotes: 0,
            downvotes: 0,
          },
        });

        return NextResponse.json({crowd: createdCrowd, crowdUserProfile}, {
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
        const crowd: PrismaCrowd | null = await prisma.crowd.findFirst({
            where: {
                id,
                creatorId: decodedToken.uid
            }
        });

        if (!crowd) {
            return NextResponse.json({error: 'Crowd not found'}, {status: 404});
        }

        await prisma.crowd.delete({
            where: {
                id,
                creatorId: decodedToken.uid
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
