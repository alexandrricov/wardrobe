import { Outlet } from "react-router";
import { useAuth } from "./providers/auth.tsx";
import { Header } from "./header.tsx";
import { Logo } from "./components/logo.tsx";
import { Button } from "./components/action.tsx";
import { signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "./firebase.ts";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export default function App() {
  const { user, loading } = useAuth();

  const login = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    const u = res.user;

    await setDoc(
      doc(db, "users", u.uid),
      {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        photoURL: u.photoURL,
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  };

  return (
    <>
      {user ? (
        <div className="h-full min-h-100dvh grid [grid-template-areas:'main''header'] sm:[grid-template-areas:'header''main'] grid-rows-[1fr_auto] sm:grid-rows-[auto_1fr]">
          <Header />
          <main className="overflow-y-auto" style={{ gridArea: "main" }}>
            <div className="max-w-150 mx-auto px-4 py-4 pb-8 w-full">
              <Outlet />
            </div>
          </main>
        </div>
      ) : loading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="text-center h-full flex flex-col justify-center items-center px-4">
          <Logo className="w-20 mx-auto text-brand mb-8" />
          <h2 className="text-2xl font-bold mb-4">Welcome to ClosetBook</h2>
          <p className="mb-8">Log in to start cataloging your wardrobe.</p>
          <Button variation="primary" onClick={login} className="mx-auto">
            Sign in with Google
          </Button>
        </div>
      )}
    </>
  );
}
