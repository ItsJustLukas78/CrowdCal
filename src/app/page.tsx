"use client"
import { Calendar } from "@/components/ui/calendar"
import { useEffect, useState} from "react"
import { Event, Crowd, User, CrowdUserProfile } from "@/types"
import { auth } from '@/lib/firebase/firebase';
import { useRouter } from 'next/navigation';
import GoogleLoginButton from "@/components/GoogleLoginButton"

// users can create and view events on a crowdsourced calendar
// clicking a date will show specific events, but by default a list of all events will be shown in order of date
// events will have a reputation system and are promoted based on user feedback


const formattedDateAndTime = (date: Date) => {
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  return { formattedDate, formattedTime };
};


export default function Home() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // store events in local storage for testing
  const [events, setEvents] = useState<Event[]>([])
  const [date, setDate] = useState<Date | undefined>(new Date())

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const eventsList = () => {
    return (
      <div>
        {events.map((event, index) => {
          const {
            formattedDate: formattedStartDate,
            formattedTime: formattedStartTime
          } = formattedDateAndTime(event.start);
          const {
            formattedDate: formattedEndDate,
            formattedTime: formattedEndTime
          } = formattedDateAndTime(event.end);

          let finalDateString;

          if (formattedStartDate === formattedEndDate) {
            // Same day format
            finalDateString = `${formattedStartDate} ${formattedStartTime} - ${formattedEndTime}`;
          } else {
            // Different day format
            finalDateString = `${formattedStartDate} ${formattedStartTime} - ${formattedEndDate} ${formattedEndTime}`;
          }

          return (
            <div key={index} className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold">{event.title}</h3>
              <p>{finalDateString}</p>
              <p>{event.description}</p>
              <p>{event.location}</p>
              <p>{event.reputation}</p>
            </div>
          );
        })}
      </div>
    );
  };

  const callTestEndpoint = async () => {
    // include the token in the headers
    const response = await fetch('/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user?.accessToken}`
      }
    });

    const data = await response.json();
  }

  return (
    <div className="relative flex w-full flex-col gap-16 scroll-m-20">
      <section className="mx-10">
        <div className="mx-auto flex max-w-screen-xl flex-col">
          <h1 id="about" className="mt-5 mb-5 max-w-2xl scroll-m-24 text-3xl font-semibold leading-none tracking-tight text-primary md:text-4xl xl:text-5xl">
            Calender
          </h1>
          {!user ? (
            <GoogleLoginButton/>
          ) : (
             <button className="w-56 bg-blue-400 rounded-xl" onClick={() => auth.signOut()}>Sign out</button>
          )}
          <p>{`Signed in as ${user?.displayName}`}</p>
          <button onClick={callTestEndpoint}>Test</button>
          <div className="flex flex-col gap-5 lg:flex-row">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            /> 
          </div>
        </div>
      </section>
    </div>
  )
}
