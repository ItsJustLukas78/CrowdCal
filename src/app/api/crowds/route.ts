import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import {admin} from "@/lib/firebase/firebase-admin";
import {Crowd as PrismaCrowd, Prisma, User} from "@prisma/client";
import {Crowd, Event} from "@/types";

type UserWithCrowds = Prisma.UserGetPayload<{
    include: {
        crowds: true
    }
}>;

export async function GET(
  request: NextRequest
) {

    const token = request.headers.get('Authorization')?.split(' ')[1];

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
            where: { firebaseUid: decodedToken.uid },
            include: {
                crowds: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const crowds: PrismaCrowd[] | undefined = user?.crowds;

        if (!crowds) {
            return NextResponse.json({error: 'No crowds found'}, {status: 404});
        }

        return NextResponse.json({crowds}, {
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
