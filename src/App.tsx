import { Outlet } from "react-router";
import { useAuth } from "./providers/auth.tsx";
import { Header } from "./header.tsx";
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
        <div className="h-dvh grid [grid-template-areas:'main''header'] sm:[grid-template-areas:'header''main'] grid-rows-[1fr_auto] sm:grid-rows-[auto_1fr]">
          <Header />
          <main className="overflow-y-auto" style={{ gridArea: "main" }}>
            <div className="max-w-4xl mx-auto px-4 py-4 pb-8 w-full">
              <Outlet />
            </div>
          </main>
        </div>
      ) : loading ? (
        <div className="text-center pt-20 text-muted">Loading...</div>
      ) : (
        <div className="text-center h-full flex flex-col justify-center items-center px-4">
          <h1 className="text-h1 mb-2">Wardrobe</h1>
          <p className="text-muted mb-8">Personal wardrobe catalog</p>
          <button
            onClick={login}
            className="px-6 py-2.5 rounded-lg bg-brand text-on-accent font-medium text-sm hover:bg-brand-dark transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      )}
    </>
  );
}
