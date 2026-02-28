"use client";

import { useEffect, useState } from "react";
import { saveToHistory, toggleWatchlist } from "@/lib/actions";
import { useAuth } from "@clerk/nextjs";

export default function WatchActions({ mediaData, initialIsListed, t }) {
	const [isListed, setIsListed] = useState(initialIsListed);
	const { isSignedIn } = useAuth();

	useEffect(() => {
		if (isSignedIn) {
			saveToHistory(mediaData);
		}
	}, [mediaData, isSignedIn]);

	if (!isSignedIn) return null;

	const handleListClick = async () => {
		const newState = await toggleWatchlist(mediaData);
		setIsListed(newState);
	};

	return (
		<button
			onClick={handleListClick}
			className={`px-6 py-3 mt-6 w-full sm:w-auto text-[11px] font-black uppercase tracking-widest italic rounded-sm transition-all border-b-4 ${
				isListed
					? "bg-zinc-800 text-white border-zinc-950 hover:bg-zinc-700"
					: "bg-red-600 text-white border-red-900 hover:bg-red-500 hover:scale-[1.02] active:translate-y-1 active:border-b-0"
			}`}
		>
			{isListed ? `✓ ${t.in_list}` : `+ ${t.add_list}`}
		</button>
	);
}
