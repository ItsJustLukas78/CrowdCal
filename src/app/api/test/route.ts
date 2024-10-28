import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import {admin} from "@/lib/firebase/firebase-admin";


export async function GET(
  request: NextRequest
) {

    const token = request.headers.get('Authorization')?.split(' ')[1];

    if (!token) {
        console.log('No token');
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    let decodedToken;

    try {
        decodedToken = await admin.auth().verifyIdToken(token);
        console.log({decodedToken});
    } catch (error) {
        console.error('Error verifying token:', error);
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    try {
        const events = await prisma.event.findMany();
        return NextResponse.json(events, {
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
