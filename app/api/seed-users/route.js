import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Реалистични имена на школи/групи за полето "name"
const groupNames = [
  "El Picante",
  "Salsa Ritmo",
  "Bachata Madness",
  "Latin Force",
  "Kizomba Varna",
  "Sabroso Dance",
  "Dance Station",
  "Street Salseros"
];

// Танцови стилове за "mainStyle"
const danceStyles = ["Bachata", "Salsa LA", "Cuban Salsa", "Kizomba", "Reggaeton"];

// Реалистични мотивационни писма за "pitch"
const pitches = [
  "Здравейте, аз съм инструктор и имам група от над 20 човека, които искат да посетят фестивала тази година. Ще се радвам да работим заедно!",
  "Ние сме голяма школа във Варна и искаме да доведем нашите начинаещи и напреднали ученици на уроците.",
  "Организирам партита и групи за латино фестивали в България от 5 години. Очаквам да докарам поне 15 човека.",
  "Искам да стана посланик на събитието, защото много мои приятели и колеги от залата искат да си купят Full Pass.",
  "Имаме страхотно Bachata общество в града и искаме да направим голямо групово посещение на Summer Salsa Fest!"
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Генерира реалистичен телефонен номер
const generatePhone = () => {
  const num = Math.floor(1000000 + Math.random() * 9000000);
  return `088 ${num}`;
};

// Генерира случайна дата в рамките на последните 20 дни (ISO String)
const getRandomDateRecent = () => {
  const start = new Date();
  start.setDate(start.getDate() - 20);
  return new Date(start.getTime() + Math.random() * (new Date().getTime() - start.getTime())).toISOString();
};

// Разпределение на статусите (повече чакащи за демото)
const getStatus = () => {
  const r = Math.random();
  if (r < 0.50) return "pending";    
  if (r < 0.85) return "approved";   
  return "rejected";                 
};

export async function GET() {
  try {
    const batch = adminDb.batch();
    let addedCount = 0;

    // Взимаме реалните потребители от базата
    const usersSnap = await adminDb.collection("users").get();
    const realUsers = [];
    usersSnap.forEach(doc => {
      // Филтрираме само обикновени потребители
      if (doc.data().role === "user" || doc.data().role === "ambassador") {
        realUsers.push({ uid: doc.id, ...doc.data() });
      }
    });

    if (realUsers.length === 0) {
      return NextResponse.json({ error: "Няма потребители в базата данни!" }, { status: 400 });
    }

    // Ще генерираме 15 заявки
    const numRequests = Math.min(15, realUsers.length);
    const shuffledUsers = realUsers.sort(() => 0.5 - Math.random()).slice(0, numRequests);

    for (const user of shuffledUsers) {
      const requestRef = adminDb.collection("ambassador_requests").doc();
      
      const requestData = {
        createdAt: getRandomDateRecent(),
        email: user.email,
        mainStyle: getRandom(danceStyles),
        name: getRandom(groupNames),
        phone: generatePhone(),
        pitch: getRandom(pitches),
        status: getStatus(),
        userId: user.uid
      };

      batch.set(requestRef, requestData);
      addedCount++;
    }

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Успешно създадени ${addedCount} заявки със 100% точни променливи (createdAt, email, mainStyle, name, phone, pitch, status, userId).` 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}