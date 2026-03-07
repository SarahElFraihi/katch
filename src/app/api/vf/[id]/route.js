// route.js
import { db } from "@/lib/db"; // Ton instance Prisma ou Supabase

export async function GET(request, { params }) {
	const { id } = params;
	const { searchParams } = new URL(request.url);
	const type = searchParams.get("type");
	const s = searchParams.get("s");
	const e = searchParams.get("e");

	// 1. Chercher dans ta table "links"
	const cached = await db.lulu_links.findFirst({
		where: { tmdb_id: id, season: s, episode: e },
	});

	if (cached) {
		return Response.json({
			url: `https://luluvdo.com/e/${cached.file_code}`,
			isLulu: true,
		});
	}

	// 2. Si non trouvé : On déclenche le scraper (via un Webhook ou une Serverless Function)
	// On ne fait pas attendre l'utilisateur, on lance la recherche en tâche de fond
	fetch(
		`${process.env.SCRAPER_URL}/search?id=${id}&type=${type}&s=${s}&e=${e}`,
	);

	// 3. Fallback immédiat vers ta source auto
	return Response.json({
		url: `https://frembed.live/api/${type === "movie" ? "film" : "serie"}.php?id=${id}`,
		isLulu: false,
	});
}
