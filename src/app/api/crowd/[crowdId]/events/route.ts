import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { admin } from "@/lib/firebase/firebase-admin";

export async function GET(request: NextRequest, context: { params: Promise<{ crowdId: string }> }) {
  const crowdId = (await context.params).crowdId; // Access crowdId from context.params

  // a single request can only get a max of 30 days of events which is default
  // a specific day can also be requested

  const date = request.nextUrl.searchParams.get("date");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  if (!crowdId) {
    return NextResponse.json({ error: 'crowdId is required' }, { status: 400 });
  }

  const token: string | undefined = request.headers.get('Authorization')?.split(' ')[1];
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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let events;
    if (date) {
      const specifiedDate = new Date(date);

      const startOfDay = new Date(specifiedDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(specifiedDate.setHours(23, 59, 59, 999));

      events = await prisma.event.findMany({
        where: {
          crowdId: crowdId,
          start: {lte: endOfDay}, // Event starts on or before the end of the day
          end: {gte: startOfDay},   // Event ends on or after the start of the day
        },
        orderBy: {start: 'asc'},
        include: {
          votes: {
            where: {
              userId: user.id
            }
          }
        }
      });
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const differenceInTime = end.getTime() - start.getTime(); // difference in milliseconds
      const differenceInDays = differenceInTime / (1000 * 3600 * 24); // convert milliseconds to days

      if (differenceInDays >= 33) {
        return NextResponse.json({ error: 'The difference between start and end date must be less than 33 days.' }, { status: 400 });
      }

      events = await prisma.event.findMany({
        where: {
          crowdId: crowdId,
          start: {lte: end}, // Event starts on or before the specified end date
          end: {gte: start},  // Event ends on or after the specified start date
        },
        orderBy: {start: 'asc'},
        include: {
          votes: {
            where: {
              userId: user.id
            }
          }
        }
      });
    } else {
      // Default behavior if no date is specified
      // return events from the start of current day to a week from now
      const start = new Date().setHours(0, 0, 0, 0);
      const end = new Date(start).setDate(new Date(start).getDate() + 7);

      events = await prisma.event.findMany({
        where: {
          crowdId: crowdId,
          start: {lte: new Date(end)}, // Event starts on or before a week from now
          end: {gte: new Date(start)},  // Event ends on or after the start of the day
        },
        orderBy: { start: 'asc' },
        include: {
          votes: {
            where: {
              userId: user.id
            }
          }
        }
      });
    }

    // await prisma.event.updateMany({
    //   where: {
    //     crowdId: crowdId
    //   },
    //   data: {
    //     upvotes: 0,
    //     downvotes: 0
    //   }
    // });
    // for (const myevent of events) {
    //     console.log(myevent.title);
    //     console.log(myevent.votes);
    // }
    //
    // console.log(events);

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}