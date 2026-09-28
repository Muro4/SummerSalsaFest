"use client";
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setLoading(true);
    setError(false);
    return onSnapshot(collection(db, "rooms"), snapshot => {
      setRooms(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    }, () => { setError(true); setLoading(false); });
  }, [revision]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return { rooms, loading, error, now, retry: () => setRevision(value => value + 1) };
}
