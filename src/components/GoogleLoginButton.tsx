"use client"
import {auth, googleProvider, signInWithPopup} from "@/lib/firebase/firebase";
import { useRouter } from 'next/navigation';

export default function googleLoginButton() {
  const router = useRouter();

  const handleGoogleLoginFunc = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Send user details to your backend to store in Prisma
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          firebaseUid: user.uid,
          name: user.displayName,
          email: user.email,
        }),
      });

      if (res.ok) {
        router.push('/'); // Redirect after successful login
      } else {
        console.log(res)
        console.error("Failed to log in or register user.");
      }
    } catch (error) {
      console.error("Google Sign-In error:", error);
    }
  }

  return (
    <button className="w-56 bg-red-500 rounded-xl" onClick={handleGoogleLoginFunc}>Sign in with Google</button>
  )
}