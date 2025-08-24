"use client";

import * as React from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { PartKeep } from "@/components/PartKeep";
import { Login } from "@/components/Login";

export default function Home() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 border-4 border-dashed rounded-full animate-spin border-primary"></div>
           <span>Loading...</span>
        </div>
      </main>
    );
  }

  return (
    <main>
      {user ? (
        <div className="p-4 sm:p-6 md:p-8">
            <PartKeep user={user} onLogout={handleLogout} />
        </div>
      ) : (
        <Login />
      )}
    </main>
  );
}
