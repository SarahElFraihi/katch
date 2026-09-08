"use client";

import { useEffect, useState } from "react";
import {
	saveToHistory,
	toggleWatchlist,
	toggleLike,
	checkLiked,
} from "@/lib/actions";
import { useAuth } from "@clerk/nextjs";

export default function WatchActions({
	mediaData,
	initialIsListed,
	initialIsLiked = false,
	t,
}) {
	const [isListed, setIsListed] = useState(initialIsListed);
	const [isLiked, setIsLiked] = useState(initialIsLiked);
	const { isSignedIn } = useAuth();

	useEffect(() => {
		if (!isSignedIn) return;

		// Synchronisation de sécurité
		checkLiked(mediaData.id).then(setIsLiked);

		// Enregistre dans l'historique après 2 minutes
		const timer = setTimeout(() => {
			saveToHistory(mediaData);
		}, 120000);

		return () => clearTimeout(timer);
	}, [mediaData, isSignedIn]);

	if (!isSignedIn) return null;

	const handleListClick = async () => {
		const newState = await toggleWatchlist(mediaData);
		setIsListed(newState);
	};

	const handleLikeClick = async () => {
		const newState = await toggleLike(mediaData);
		setIsLiked(newState);
	};

	return (
		<div className="flex items-center gap-3 mt-6 flex-wrap">
			{/* Bouton Ma Liste */}
			<button
				onClick={handleListClick}
				className={`px-6 py-3 w-full sm:w-auto text-[11px] font-black uppercase tracking-widest italic rounded-sm transition-all border-b-4 ${
					isListed
						? "bg-zinc-800 text-white border-zinc-950 hover:bg-zinc-700"
						: "bg-red-600 text-white border-red-900 hover:bg-red-500 hover:scale-[1.02] active:translate-y-1 active:border-b-0"
				}`}
			>
				{isListed ? `✓ ${t.in_list}` : `+ ${t.add_list}`}
			</button>

			{/* Bouton J'aime */}
			<button
				onClick={handleLikeClick}
				className={`px-6 py-3 w-full sm:w-auto text-[11px] font-black uppercase tracking-widest italic rounded-sm transition-all border-b-4 flex items-center justify-center gap-2 ${
					isLiked
						? "bg-red-600 text-white border-red-900 shadow-lg shadow-red-900/50 hover:bg-red-500"
						: "bg-zinc-900 text-zinc-400 border-zinc-950 hover:text-white hover:bg-zinc-800"
				}`}
			>
				<span>{isLiked ? "♥ J'AIME" : "♡ J'AIME"}</span>
			</button>
		</div>
	);
}
