"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";

import { CHAPTERS_NAMES_FR } from "@/lib/chapters-fr";
import { tInk } from "@/lib/lorcana-fr";
import AppHeader from "app/components/AppHeader";

/* ============================================================
   TYPES
============================================================ */

type Card = {
  id: string;
  setCode?: string | null;
  setName: string;
  ink?: string | null;
  rarity?: string | null;
  usd?: number | null;
  usd_foil?: number | null;
  name_fr?: string | null;
  imageUrl?: string | null;
};

type ColRow = {
  cardId: string;
  quantity: number;
  variant?: string;
};

type ChapterStat = {
  code: string;
  name: string;
  total: number;
  aOwned: number;
  gOwned: number;
  duoOwned: number;
};

/* ============================================================
   UTILS
============================================================ */

const pct = (a: number, b: number) =>
  b === 0 ? 0 : Math.round((a / b) * 100);

const euro = (usd?: number | null) =>
  Number(((usd || 0) * 0.92).toFixed(2));

const chapterImages = [
  "/chapters/ch1.jpg",
  "/chapters/ch2.jpg",
  "/chapters/ch3.jpg",
  "/chapters/ch4.jpg",
  "/chapters/ch5.jpg",
  "/chapters/ch6.jpg",
  "/chapters/ch7.jpg",
  "/chapters/ch8.jpg",
  "/chapters/ch9.jpg",
  "/chapters/ch10.jpg",
  "/chapters/ch11.jpg",
  "/chapters/ch12.jpg",
];

const badgeForPct = (p: number) => {
  if (p === 100) return "💎 Complet";
  if (p >= 75) return "🥇 Or";
  if (p >= 50) return "🥈 Argent";
  if (p >= 25) return "🥉 Bronze";
  return "🔰 Début";
};

const COLORS = ["#22c55e", "#e5e7eb"];

/* ============================================================
   PAGE
============================================================ */

export default function StatsPage() {
  const [cards, setCards] = useState<Card[]>([]);

  const [aCol, setACol] = useState<
    Record<
      string,
      {
        normal: number;
        foil: number;
      }
    >
  >({});

  const [gCol, setGCol] = useState<
    Record<
      string,
      {
        normal: number;
        foil: number;
      }
    >
  >({});

  const [loading, setLoading] = useState(true);

  /* ================= LOAD ================= */

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [cardsR, aR, gR] = await Promise.all([
        fetch("/api/cards", {
          cache: "no-store",
        }),

        fetch(
          "/api/collection?userId=adrien",
          {
            cache: "no-store",
          }
        ),

        fetch(
          "/api/collection?userId=angele",
          {
            cache: "no-store",
          }
        ),
      ]);

      const cardsData: Card[] =
        await cardsR.json();

      const aData: ColRow[] =
        await aR.json();

      const gData: ColRow[] =
        await gR.json();

      const aMap: Record<
        string,
        {
          normal: number;
          foil: number;
        }
      > = {};

      const gMap: Record<
        string,
        {
          normal: number;
          foil: number;
        }
      > = {};

      aData.forEach((r) => {
        if (!aMap[r.cardId]) {
          aMap[r.cardId] = {
            normal: 0,
            foil: 0,
          };
        }

        if (r.variant === "foil") {
          aMap[r.cardId].foil +=
            r.quantity;
        } else {
          aMap[r.cardId].normal +=
            r.quantity;
        }
      });

      gData.forEach((r) => {
        if (!gMap[r.cardId]) {
          gMap[r.cardId] = {
            normal: 0,
            foil: 0,
          };
        }

        if (r.variant === "foil") {
          gMap[r.cardId].foil +=
            r.quantity;
        } else {
          gMap[r.cardId].normal +=
            r.quantity;
        }
      });

      setCards(cardsData);
      setACol(aMap);
      setGCol(gMap);

      setLoading(false);
    }

    load();
  }, []);

  /* ================= GLOBAL ================= */

  const global = useMemo(() => {
    let a = 0;
    let g = 0;
    let duo = 0;

    let aValue = 0;
    let gValue = 0;

    let enchanteds = 0;
    let legendaries = 0;

    let bestCard: any = null;

    cards.forEach((c) => {
      const ah =
        (aCol[c.id]?.normal ?? 0) +
        (aCol[c.id]?.foil ?? 0) > 0;

      const gh =
        (gCol[c.id]?.normal ?? 0) +
        (gCol[c.id]?.foil ?? 0) > 0;

      const owned =
        ah || gh;

      if (ah) a++;
      if (gh) g++;
      if (owned) duo++;

      const normalValue =
        euro(c.usd);

      const foilValue =
        euro(c.usd_foil);

      const aNormal =
        aCol[c.id]?.normal ?? 0;

      const aFoil =
        aCol[c.id]?.foil ?? 0;

      const gNormal =
        gCol[c.id]?.normal ?? 0;

      const gFoil =
        gCol[c.id]?.foil ?? 0;

      aValue +=
        normalValue * aNormal +
        foilValue * aFoil;

      gValue +=
        normalValue * gNormal +
        foilValue * gFoil;

      if (owned) {
        if (c.rarity === "ENCHANTED") {
          enchanteds++;
        }

        if (c.rarity === "LEGENDARY") {
          legendaries++;
        }
      }

      const value = Math.max(
        normalValue,
        foilValue
      );

      if (
        owned &&
        (
          !bestCard ||
          value >
            Math.max(
              euro(bestCard.usd),
              euro(bestCard.usd_foil)
            )
        )
      ) {
        bestCard = c;
      }
    });

    return {
      total: cards.length,

      a,
      g,
      duo,

      pct: pct(
        duo,
        cards.length
      ),

      aValue:
        Math.round(aValue),

      gValue:
        Math.round(gValue),

      duoValue: Math.round(
        aValue + gValue
      ),

      enchanteds,
      legendaries,

      bestCard,
    };
  }, [cards, aCol, gCol]);

  /* ================= CHAPTERS ================= */

  const chapters = useMemo(() => {
    const map = new Map<
      string,
      ChapterStat
    >();

    cards.forEach((c) => {
      if (
        !c.setCode ||
        !/^\d+$/.test(c.setCode)
      )
        return;

      if (!map.has(c.setCode)) {
        map.set(c.setCode, {
          code: c.setCode,

          name:
            CHAPTERS_NAMES_FR[
              c.setCode
            ] ??
            `Chapitre ${c.setCode}`,

          total: 0,
          aOwned: 0,
          gOwned: 0,
          duoOwned: 0,
        });
      }

      const row = map.get(
        c.setCode
      )!;

      row.total++;

      const ah =
        (aCol[c.id]?.normal ?? 0) +
        (aCol[c.id]?.foil ?? 0) > 0;

      const gh =
        (gCol[c.id]?.normal ?? 0) +
        (gCol[c.id]?.foil ?? 0) > 0;

      if (ah)
        row.aOwned++;

      if (gh)
        row.gOwned++;

      if (ah || gh)
        row.duoOwned++;
    });

    return [...map.values()].sort(
      (a, b) =>
        Number(a.code) -
        Number(b.code)
    );
  }, [cards, aCol, gCol]);

  /* ================= CHARTS ================= */

  const pieData = [
    {
      name: "Complété",
      value: global.pct,
    },
    {
      name: "Manquant",
      value: 100 - global.pct,
    },
  ];

  const radarData = useMemo(() => {
    const map: Record<
      string,
      number
    > = {};

    cards.forEach((c) => {
      if (!c.ink) return;

      const owned =
        (aCol[c.id]?.normal ?? 0) +
        (aCol[c.id]?.foil ?? 0) > 0 ||
        (gCol[c.id]?.normal ?? 0) +
        (gCol[c.id]?.foil ?? 0) > 0;

      if (!owned) return;

      map[c.ink] =
        (map[c.ink] ?? 0) + 1;
    });

    return Object.entries(map).map(
      ([ink, value]) => ({
        ink: tInk(ink),
        value,
      })
    );
  }, [cards, aCol, gCol]);

  const barData = chapters.map(
    (c) => ({
      name: c.code,

      progress: pct(
        c.duoOwned,
        c.total
      ),
    })
  );

  /* ================= LOADING ================= */

  if (loading) {
    return (
      <>
        <AppHeader />

        <main className="min-h-screen bg-[#f8f4eb] flex items-center justify-center">
          <div className="rounded-[32px] bg-white px-10 py-8 shadow-xl text-center">
            <div className="text-6xl mb-4 animate-pulse">
              ✨
            </div>

            <p className="text-2xl font-black">
              Chargement des statistiques...
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-[#f8f4eb] pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">

          {/* HERO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[40px] p-8 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
          >
            <div className="absolute inset-0 bg-black/10" />

            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10 grid xl:grid-cols-2 gap-8 items-center">
              <div>
                <p className="uppercase tracking-[0.3em] text-white/70 text-sm font-black mb-3">
                  Collection Lorcana
                </p>

                <h1 className="text-6xl md:text-7xl font-black text-white leading-none">
                  {global.pct}%
                </h1>

                <p className="text-white/80 text-xl mt-4 max-w-xl">
                  {global.duo} cartes collectionnées ✨
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                  <div className="px-5 py-3 rounded-2xl bg-white/15 backdrop-blur-xl text-white font-black">
                    👑 {global.legendaries} légendaires
                  </div>

                  <div className="px-5 py-3 rounded-2xl bg-white/15 backdrop-blur-xl text-white font-black">
                    ✨ {global.enchanteds} enchantées
                  </div>

                  <div className="px-5 py-3 rounded-2xl bg-white/15 backdrop-blur-xl text-white font-black">
                    📚 {chapters.length} chapitres
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-[28px] bg-white/15 backdrop-blur-xl p-6 border border-white/10">
                  <p className="text-white/60 text-sm uppercase font-black">
                    Valeur totale
                  </p>

                  <p className="text-5xl font-black text-white mt-3">
                    {global.duoValue}€
                  </p>
                </div>

                <div className="rounded-[28px] bg-white/15 backdrop-blur-xl p-4 border border-white/10 flex gap-4 items-center min-h-[170px]">
  
                  {global.bestCard?.imageUrl && (
                    <img
                      src={global.bestCard.imageUrl}
                      alt={global.bestCard.name_fr || ""}
                      className="w-24 rounded-2xl shadow-2xl border border-white/20"
                    />
                  )}

                  <div className="flex flex-col justify-center">
                    <p className="text-white/60 text-xs uppercase font-black">
                      Carte la plus chère
                    </p>

                    <p className="text-2xl font-black text-white leading-tight mt-2">
                      {global.bestCard?.name_fr || "Aucune"}
                    </p>

                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-black/20 text-white font-black text-lg w-fit">
                      💰
                      {Math.max(
                        euro(global.bestCard?.usd),
                        euro(global.bestCard?.usd_foil)
                      )}€
                    </div>

                    {global.bestCard?.usd_foil &&
                      global.bestCard.usd_foil >
                        global.bestCard.usd && (
                        <div className="mt-2 text-sm font-black text-yellow-200">
                          ✨ Version foil
                        </div>
                      )}
                  </div>
                </div>

                <div className="rounded-[28px] bg-white/15 backdrop-blur-xl p-6 border border-white/10">
                  <p className="text-white/60 text-sm uppercase font-black">
                    Adrien
                  </p>

                  <p className="text-4xl font-black text-white mt-3">
                    {global.aValue}€
                  </p>
                </div>

                <div className="rounded-[28px] bg-white/15 backdrop-blur-xl p-6 border border-white/10">
                  <p className="text-white/60 text-sm uppercase font-black">
                    Angèle
                  </p>

                  <p className="text-4xl font-black text-white mt-3">
                    {global.gValue}€
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* QUICK STATS */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              ["📦", global.duo, "Cartes"],
              ["👑", global.legendaries, "Légendaires"],
              ["✨", global.enchanteds, "Enchantées"],
              ["💰", `${global.duoValue}€`, "Valeur"],
            ].map(([icon, value, label]) => (
              <motion.div
                whileHover={{ y: -4 }}
                key={String(label)}
                className="rounded-[32px] bg-white border border-black/10 p-6 shadow-lg"
              >
                <div className="text-4xl">
                  {icon}
                </div>

                <p className="text-5xl font-black mt-5">
                  {value}
                </p>

                <p className="text-neutral-500 mt-2 font-medium">
                  {label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CHARTS */}
          <div className="grid xl:grid-cols-3 gap-5">

            {/* DONUT */}
            <div className="rounded-[32px] bg-white border border-black/10 p-6 shadow-lg">
              <h2 className="text-2xl font-black mb-5">
                🎯 Progression
              </h2>

              <div className="h-[260px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={70}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map(
                        (_, index) => (
                          <Cell
                            key={index}
                            fill={
                              COLORS[
                                index
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <p className="text-center text-5xl font-black -mt-8">
                {global.pct}%
              </p>
            </div>

            {/* RADAR */}
            <div className="rounded-[32px] bg-white border border-black/10 p-6 shadow-lg">
              <h2 className="text-2xl font-black mb-5">
                🌈 Encres
              </h2>

              <div className="h-[260px]">
                <ResponsiveContainer>
                  <RadarChart data={radarData}>
                    <PolarGrid />

                    <PolarAngleAxis dataKey="ink" />

                    <Radar
                      dataKey="value"
                      fill="#f59e0b"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BAR */}
            <div className="rounded-[32px] bg-white border border-black/10 p-6 shadow-lg">
              <h2 className="text-2xl font-black mb-5">
                📚 Chapitres
              </h2>

              <div className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={barData}>
                    <XAxis dataKey="name" />

                    <Tooltip />

                    <Bar
                      dataKey="progress"
                      radius={[10, 10, 0, 0]}
                      fill="#22c55e"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CHAPTERS */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-4xl font-black">
                  📖 Chapitres
                </h2>

                <p className="text-neutral-500 mt-1">
                  Progression complète Lorcana
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {chapters.map((chapter) => {
                const progress = pct(
                  chapter.duoOwned,
                  chapter.total
                );

                return (
                  <motion.div
                    whileHover={{ y: -5 }}
                    key={chapter.code}
                    className="group relative overflow-hidden rounded-[32px] bg-white border border-black/10 shadow-lg"
                  >
                    <div className="relative h-[180px] overflow-hidden">
                      <img
                        src={
                          chapterImages[
                            Number(
                              chapter.code
                            ) - 1
                          ]
                        }
                        alt={chapter.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white/70 text-sm font-black">
                          Chapitre {chapter.code}
                        </p>

                        <h3 className="text-white text-2xl font-black leading-tight">
                          {chapter.name}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-black text-neutral-800">
                          Progression
                        </p>

                        <p className="text-2xl font-black">
                          {progress}%
                        </p>
                      </div>

                      <div className="h-3 rounded-full bg-neutral-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="px-3 py-2 rounded-2xl bg-neutral-100 text-sm font-black">
                          {badgeForPct(
                            progress
                          )}
                        </div>

                        <div className="text-sm font-black text-neutral-500">
                          {chapter.duoOwned}/
                          {chapter.total}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* OBJECTIFS */}
          <div className="rounded-[32px] bg-gradient-to-br from-neutral-900 to-black p-8 text-white shadow-2xl">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-8">
              <div>
                <p className="uppercase tracking-[0.3em] text-white/50 text-sm font-black mb-3">
                  Objectifs
                </p>

                <h2 className="text-5xl font-black leading-none">
                  🎯 Prochaine étape
                </h2>

                <p className="text-white/70 text-xl mt-4">
                  Plus que {global.total - global.duo} cartes avant le 100% ✨
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[420px]">
                <div className="rounded-[28px] bg-white/10 backdrop-blur-xl p-5">
                  <p className="text-white/60 text-sm font-black">
                    Cartes manquantes
                  </p>

                  <p className="text-5xl font-black mt-3">
                    {global.total - global.duo}
                  </p>
                </div>

                <div className="rounded-[28px] bg-white/10 backdrop-blur-xl p-5">
                  <p className="text-white/60 text-sm font-black">
                    Progression
                  </p>

                  <p className="text-5xl font-black mt-3">
                    {global.pct}%
                  </p>
                </div>

                <div className="rounded-[28px] bg-white/10 backdrop-blur-xl p-5">
                  <p className="text-white/60 text-sm font-black">
                    Valeur totale
                  </p>

                  <p className="text-5xl font-black mt-3">
                    {global.duoValue}€
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
