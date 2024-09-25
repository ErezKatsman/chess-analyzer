"use client";

import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { AuroraBackground } from "./ui/aurora-background";
import { Button } from "./ui/button";
import Link from "next/link";
import { Input } from "./ui/input";
import { checkAndSetUserExist } from "@/lib/userUtils";

export function Hero() {
  const [userName, setUserName] = useState("");
  const [isClickable, setIsClickable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (userName.length !== 0) {
      timeoutId = setTimeout(
        () => checkAndSetUserExist(setIsClickable, setError, userName),
        2000
      );
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [userName]);

  return (
    <AuroraBackground className="bg-slate-600">
      <motion.div
        initial={{ opacity: 0.0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative flex flex-col gap-4 items-center justify-center px-4"
      >
        <div className="text-3xl md:text-7xl font-bold dark:text-white text-center">
          Be better chess player from now
        </div>
        <div className=" text-center font-extralight text-base md:text-4xl dark:text-neutral-200 py-4">
          You can analyze all your chess.com games for free
        </div>

        <div className="relative flex flex-col items-center w-full">
          {error && (
            <div className="absolute top-[-15px] text-red-400 text-sm font-bold">
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Input
            className="lg:p-6 lg:text-xl"
            placeholder="chess.com username"
            value={userName}
            onChange={(e) => {
              setIsClickable(false);
              setError(null);
              setUserName(e.target.value);
            }}
          />

          <Link
            aria-disabled={!isClickable}
            href={{
              pathname: "user",
              query: { userName: userName },
            }}
            className={!isClickable ? "pointer-events-none" : ""}
          >
            <Button disabled={!isClickable} className="lg:p-6 lg:text-xl">
              Start
            </Button>
          </Link>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
