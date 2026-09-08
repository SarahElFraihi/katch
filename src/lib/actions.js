"use server";

import { supabase } from "./supabase";
import { auth } from "@clerk/nextjs/server";

// 1. Sauvegarder la progression dans l'historique
export async function saveToHistory(mediaData) {
	const { userId } = await auth();
	if (!userId) return; // Si non connecté, on ne fait rien

	await supabase.from("history").upsert(
		{
			user_id: userId,
			media_id: mediaData.id,
			media_type: mediaData.type,
			title: mediaData.title,
			poster_path: mediaData.poster_path,
			season: mediaData.season || 1,
			episode: mediaData.episode || 1,
			updated_at: new Date(),
		},
		{ onConflict: "user_id, media_id" },
	);
}

// 2. Ajouter/Retirer de "Ma Liste"
export async function toggleWatchlist(mediaData) {
	const { userId } = await auth();
	if (!userId) return false;

	// On vérifie si le film est déjà dans la liste
	const { data } = await supabase
		.from("watchlist")
		.select("id")
		.eq("user_id", userId)
		.eq("media_id", mediaData.id)
		.single();

	if (data) {
		// S'il y est, on le supprime (Retirer)
		await supabase.from("watchlist").delete().eq("id", data.id);
		return false;
	} else {
		// Sinon, on l'ajoute
		await supabase.from("watchlist").insert({
			user_id: userId,
			media_id: mediaData.id,
			media_type: mediaData.type,
			title: mediaData.title,
			poster_path: mediaData.poster_path,
		});
		return true;
	}
}

// 3. Vérifier l'état initial (est-ce que le film est déjà dans les favoris ?)
export async function checkWatchlist(mediaId) {
	const { userId } = await auth();
	if (!userId) return false;

	const { data } = await supabase
		.from("watchlist")
		.select("id")
		.eq("user_id", userId)
		.eq("media_id", mediaId)
		.single();

	return !!data; // Renvoie true si trouvé, false sinon
}

// 4. Récupérer l'historique de l'utilisateur
export async function getUserHistory() {
	const { userId } = await auth();
	if (!userId) return [];

	// On récupère les 15 derniers films/séries regardés, du plus récent au plus ancien
	const { data } = await supabase
		.from("history")
		.select("*")
		.eq("user_id", userId)
		.order("updated_at", { ascending: false })
		.limit(15);

	return data || [];
}

// 5. Récupérer la liste de favoris
export async function getUserWatchlist() {
	const { userId } = await auth();
	if (!userId) return [];

	// On récupère les films ajoutés à la liste
	const { data } = await supabase
		.from("watchlist")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	return data || [];
}

// 6. Vérifier si un titre est liké
export async function checkLiked(mediaId) {
	const { userId } = await auth();
	if (!userId || !mediaId) return false;

	const numericId = parseInt(mediaId, 10);

	const { data, error } = await supabase
		.from("likes")
		.select("id")
		.eq("user_id", userId)
		.eq("media_id", numericId)
		.maybeSingle();

	if (error) {
		console.error("Erreur checkLiked:", error);
		return false;
	}

	return !!data;
}

// 7. Liker / Dé-liker (Toggle Like)
export async function toggleLike(mediaData) {
	const { userId } = await auth();
	if (!userId || !mediaData?.id) return false;

	const numericId = parseInt(mediaData.id, 10);

	// Vérifie si déjà liké
	const { data } = await supabase
		.from("likes")
		.select("id")
		.eq("user_id", userId)
		.eq("media_id", numericId)
		.maybeSingle();

	if (data) {
		const { error } = await supabase.from("likes").delete().eq("id", data.id);
		if (error) console.error("Erreur suppression like:", error);
		return false;
	} else {
		const { error } = await supabase.from("likes").insert({
			user_id: userId,
			media_id: numericId,
			media_type: mediaData.type || "movie",
			title: mediaData.title || "",
			poster_path: mediaData.poster_path || "",
		});
		if (error) console.error("Erreur insertion like:", error);
		return true;
	}
}

// 8. Récupérer les titres likés par l'utilisateur
export async function getUserLiked() {
	const { userId } = await auth();
	if (!userId) return [];

	const { data, error } = await supabase
		.from("likes")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	if (error) {
		console.error("Erreur getUserLiked:", error);
		return [];
	}

	return data || [];
}
