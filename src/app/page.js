import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getUserHistory, getUserWatchlist, getUserLiked } from "@/lib/actions";

// ─── TEXTES ──────────────────────────────────────────────────────────────────
const T = {
	home: "Accueil",
	movies: "Films",
	series: "Séries",
	animes: "Animes",
	search: "RECHERCHER...",
	trending: "Tendances",
	results: "Résultats pour",
	no_results: "Aucun contenu trouvé...",
	watch: "▶ REGARDER",
	continue_watching: "Reprendre la lecture",
	my_list: "Ma Liste",
	prev_page: "←",
	next_page: "→",
};

// ─── GENRES ──────────────────────────────────────────────────────────────────
const GENRES = {
	movie: [
		{ id: 28, name: "Action" },
		{ id: 12, name: "Aventure" },
		{ id: 16, name: "Animation" },
		{ id: 35, name: "Comédie" },
		{ id: 80, name: "Crime" },
		{ id: 99, name: "Documentaire" },
		{ id: 18, name: "Drame" },
		{ id: 10751, name: "Famille" },
		{ id: 14, name: "Fantastique" },
		{ id: 36, name: "Histoire" },
		{ id: 27, name: "Horreur" },
		{ id: 10402, name: "Musique" },
		{ id: 9648, name: "Mystère" },
		{ id: 10749, name: "Romance" },
		{ id: 878, name: "Science-Fiction" },
		{ id: 53, name: "Thriller" },
		{ id: 10752, name: "Guerre" },
		{ id: 37, name: "Western" },
		{ id: "zombie", name: "Zombies" },
	],
	tv: [
		{ id: 10759, name: "Action & Aventure" },
		{ id: 16, name: "Animation" },
		{ id: 35, name: "Comédie" },
		{ id: 80, name: "Crime" },
		{ id: 99, name: "Documentaire" },
		{ id: 18, name: "Drame" },
		{ id: 10751, name: "Famille" },
		{ id: 10762, name: "Kids" },
		{ id: 9648, name: "Mystère" },
		{ id: 10764, name: "Téléréalité" },
		{ id: 10765, name: "Sci-Fi & Fantastique" },
		{ id: "zombie", name: "Zombies" },
	],
	anime: [
		{ id: 10759, name: "Action" },
		{ id: 35, name: "Comédie" },
		{ id: 18, name: "Drame" },
		{ id: 10765, name: "Fantaisie" },
		{ id: 9648, name: "Mystère" },
		{ id: 10751, name: "Famille" },
		{ id: "zombie", name: "Zombies" },
	],
	kdrama: [
		{ id: 18, name: "Drame" },
		{ id: 35, name: "Comédie" },
		{ id: 10749, name: "Romance" },
		{ id: 10759, name: "Action & Aventure" },
		{ id: 9648, name: "Mystère" },
		{ id: 10765, name: "Sci-Fi & Fantaisie" },
		{ id: "zombie", name: "Zombies" },
	],
};

// ─── FETCH TMDB PERSONNALISÉ ────────────────────────────────────────────────
async function getCustomCollection(endpoint, params = "") {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const res = await fetch(
		`https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&language=fr-FR${params}`,
		{ next: { revalidate: 3600 } },
	);
	if (!res.ok) return [];
	const data = await res.json();
	return (data.results || []).filter(
		(item) =>
			item.poster_path && item.backdrop_path && item.media_type !== "person",
	);
}

// ─── FETCH STANDARD & MULTI-GENRES ──────────────────────────────────────────
async function getData(type = "all", genreParam = "", page = 1) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

	const getUrl = (p) => {
		if (genreParam) {
			const baseType = type === "anime" || type === "kdrama" ? "tv" : type;

			let langFilter = "";
			if (type === "anime") langFilter = "&with_original_language=ja";
			if (type === "kdrama") langFilter = "&with_original_language=ko";

			const tags = genreParam.split(",").filter(Boolean);

			// Pour les animes, on force toujours le genre Animation (16) en plus des sous-genres demandés
			if (type === "anime" && !tags.includes("16")) {
				tags.push("16");
			}

			let filterParam = "";
			if (tags.includes("zombie")) {
				filterParam = `&with_keywords=12377|9759|14582`;
			} else if (tags.length > 0) {
				filterParam = `&with_genres=${tags.join(",")}`;
			}

			return `https://api.themoviedb.org/3/discover/${baseType}?api_key=${apiKey}&language=fr-FR${filterParam}${langFilter}&sort_by=popularity.desc&page=${p}`;
		}

		if (type === "anime")
			return `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=fr-FR&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${p}`;
		if (type === "kdrama")
			return `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=fr-FR&with_original_language=ko&sort_by=popularity.desc&page=${p}`;
		if (type === "all")
			return `https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}&language=fr-FR&page=${p}`;

		return `https://api.themoviedb.org/3/trending/${type}/week?api_key=${apiKey}&language=fr-FR&page=${p}`;
	};

	const [res1, res2] = await Promise.all([
		fetch(getUrl(page * 2 - 1)),
		fetch(getUrl(page * 2)),
	]);
	const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
	const combined = [...(data1.results || []), ...(data2.results || [])];

	const filtered = combined.filter(
		(item) =>
			item.poster_path && item.backdrop_path && item.media_type !== "person",
	);
	const unique = Array.from(new Map(filtered.map((i) => [i.id, i])).values());

	return {
		results: unique,
		total_pages: Math.ceil((data1.total_results || 0) / 18),
	};
}

// ─── RECHERCHE BILINGUE ─────────────────────────────────────────────────────
async function searchData(type, query, page = 1) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

	const buildUrl = (lang, p) => {
		let searchType = "multi";
		if (type === "movie") searchType = "movie";
		if (type === "tv" || type === "anime" || type === "kdrama")
			searchType = "tv";
		return `https://api.themoviedb.org/3/search/${searchType}?api_key=${apiKey}&language=${lang}&query=${encodeURIComponent(query)}&page=${p}&include_adult=false`;
	};

	const [frRes1, frRes2, enRes1, enRes2] = await Promise.all([
		fetch(buildUrl("fr-FR", page * 2 - 1)),
		fetch(buildUrl("fr-FR", page * 2)),
		fetch(buildUrl("en-US", page * 2 - 1)),
		fetch(buildUrl("en-US", page * 2)),
	]);

	const [frData1, frData2, enData1, enData2] = await Promise.all([
		frRes1.json(),
		frRes2.json(),
		enRes1.json(),
		enRes2.json(),
	]);

	const allResults = [
		...(frData1.results || []),
		...(frData2.results || []),
		...(enData1.results || []),
		...(enData2.results || []),
	];

	const filtered = allResults.filter(
		(item) => item.poster_path && item.media_type !== "person",
	);

	const map = new Map();
	for (const item of filtered) {
		const existing = map.get(item.id);
		if (!existing || (item.backdrop_path && !existing.backdrop_path)) {
			map.set(item.id, item);
		}
	}
	const unique = Array.from(map.values());

	const typeFiltered = unique.filter((item) => {
		if (type === "movie")
			return item.media_type === "movie" || !item.media_type;
		if (type === "tv" || type === "anime")
			return item.media_type === "tv" || !item.media_type;
		if (type === "kdrama")
			return (
				(item.media_type === "tv" || !item.media_type) &&
				item.original_language === "ko"
			);
		return true;
	});

	const q = query.toLowerCase().trim();
	const scored = typeFiltered.map((item) => {
		const title = (item.title || item.name || "").toLowerCase();
		const originalTitle = (
			item.original_title ||
			item.original_name ||
			""
		).toLowerCase();

		let score = item.popularity || 0;
		if (title === q || originalTitle === q) score += 1000;
		else if (title.startsWith(q) || originalTitle.startsWith(q)) score += 300;
		else if (title.includes(q) || originalTitle.includes(q)) score += 100;

		if (item.vote_count > 5000) score += 200;
		else if (item.vote_count > 1000) score += 100;

		if (!item.backdrop_path) score -= 150;

		return { ...item, _score: score };
	});

	scored.sort((a, b) => b._score - a._score);

	return {
		results: scored,
		total_pages: Math.max(frData1.total_pages || 1, enData1.total_pages || 1),
	};
}

// ─── PAGE PRINCIPALE ─────────────────────────────────────────────────────────
export default async function Home({ searchParams }) {
	const sp = await searchParams;
	const currentType = sp?.type || "all";
	const query = sp?.q || "";
	const genreParam = sp?.genre || "";
	const currentPage = parseInt(sp?.page) || 1;

	const selectedTags = genreParam ? genreParam.split(",").filter(Boolean) : [];

	const { userId } = await auth();
	let history = [];
	let watchlist = [];
	let sections = [];
	let heroItem = null;
	const isSearchOrGenre = !!(query || selectedTags.length > 0);

	if (userId && !isSearchOrGenre) {
		const [h, w] = await Promise.all([getUserHistory(), getUserWatchlist()]);
		history =
			currentType !== "all" ? h.filter((x) => x.media_type === currentType) : h;
		watchlist =
			currentType !== "all" ? w.filter((x) => x.media_type === currentType) : w;
	}

	if (query) {
		// RECHERCHE BILINGUE
		const data = await searchData(
			currentType === "all" ? "multi" : currentType,
			query,
			currentPage,
		);
		const items = (data.results || []).map((it) => ({
			...it,
			media_type:
				currentType === "anime" ? "anime" : it.media_type || currentType,
		}));
		sections.push({
			title: `${T.results} "${query}"`,
			items,
			isGrid: true,
			totalPages: Math.min(data.total_pages, 500),
			currentPage,
		});
	} else if (selectedTags.length > 0) {
		// EXPLORATION MULTI-TAGS
		const data = await getData(
			currentType === "all" ? "movie" : currentType,
			genreParam,
			currentPage,
		);
		let items = data.results || [];
		if (items.length > 0 && currentPage === 1) {
			heroItem = items[0];
			items = items.slice(1);
		}

		const activeGenreNames = selectedTags
			.map(
				(tagId) =>
					GENRES[currentType]?.find((g) => g.id.toString() === tagId.toString())
						?.name || tagId,
			)
			.join(" + ");

		sections.push({
			title: `${activeGenreNames}`,
			items: items.map((it) => ({
				...it,
				media_type: currentType === "anime" ? "anime" : it.media_type,
			})),
			isGrid: true,
			totalPages: Math.min(data.total_pages, 500),
			currentPage,
		});
	} else if (currentType === "all") {
		// ─── ACCUEIL (Avec Top 10 Netflix et Plus de Catégories) ─────────────
		const [
			trendingData,
			topMoviesRaw,
			topSeriesRaw,
			crimeList,
			animationList,
			horrorList,
			comedyList,
			scifiList,
			userLiked,
		] = await Promise.all([
			getData("all"),
			getCustomCollection("trending/movie/week"),
			getCustomCollection("trending/tv/week"),
			getCustomCollection(
				"discover/movie",
				"&with_genres=80&sort_by=popularity.desc",
			),
			getCustomCollection(
				"discover/movie",
				"&with_genres=16&sort_by=popularity.desc",
			),
			getCustomCollection(
				"discover/movie",
				"&with_genres=27&sort_by=popularity.desc",
			),
			getCustomCollection(
				"discover/movie",
				"&with_genres=35&sort_by=popularity.desc",
			),
			getCustomCollection(
				"discover/movie",
				"&with_genres=878&sort_by=popularity.desc",
			),
			userId ? getUserLiked() : Promise.resolve([]),
		]);

		heroItem = trendingData.results?.[0];

		if (history.length > 0)
			sections.push({
				title: T.continue_watching,
				items: history.map((h) => ({
					...h,
					id: h.media_id,
					progress:
						h.media_type === "tv" || h.media_type === "anime"
							? `S${h.season} E${h.episode}`
							: null,
				})),
				isGrid: false,
			});

		if (watchlist.length > 0)
			sections.push({
				title: T.my_list,
				items: watchlist.map((w) => ({ ...w, id: w.media_id })),
				isGrid: false,
			});

		// ─── RECOMMANDATIONS BASÉES SUR LE DERNIER TITRE LIKÉ ───
		if (userLiked && userLiked.length > 0) {
			const lastLiked = userLiked[0];
			const recs = await getRecommendationsForMedia(
				lastLiked.media_id,
				lastLiked.media_type,
			);

			if (recs.length > 0) {
				sections.push({
					title: `Parce que vous avez aimé "${lastLiked.title}"`,
					items: recs.map((it) => ({
						...it,
						media_type: lastLiked.media_type || "movie",
					})),
					isGrid: false,
				});
			}
		}

		sections.push({
			title: "Tendances de la semaine",
			items: trendingData.results?.slice(1) || [],
			isGrid: false,
		});

		sections.push({
			title: "Top 10 des films aujourd'hui",
			items: topMoviesRaw
				.slice(0, 10)
				.map((it) => ({ ...it, media_type: "movie" })),
			isTop10: true,
		});

		sections.push({
			title: "Top 10 des séries aujourd'hui",
			items: topSeriesRaw
				.slice(0, 10)
				.map((it) => ({ ...it, media_type: "tv" })),
			isTop10: true,
		});

		sections.push({
			title: "Crime",
			items: crimeList.map((it) => ({ ...it, media_type: "movie" })),
			isGrid: false,
		});

		sections.push({
			title: "Animation",
			items: animationList.map((it) => ({ ...it, media_type: "movie" })),
			isGrid: false,
		});

		sections.push({
			title: "Frissons & Horreur",
			items: horrorList.map((it) => ({ ...it, media_type: "movie" })),
			isGrid: false,
		});

		sections.push({
			title: "Comédies",
			items: comedyList.map((it) => ({ ...it, media_type: "movie" })),
			isGrid: false,
		});

		sections.push({
			title: "Science-Fiction",
			items: scifiList.map((it) => ({ ...it, media_type: "movie" })),
			isGrid: false,
		});
	} else {
		// ─── PAGES CATÉGORIES (Films, Séries, etc.) ──────────────────────────
		const trendingData = await getData(currentType);
		heroItem = trendingData.results?.[0];

		if (history.length > 0)
			sections.push({
				title: T.continue_watching,
				items: history.map((h) => ({
					...h,
					id: h.media_id,
					progress: `S${h.season} E${h.episode}`,
				})),
				isGrid: false,
			});

		if (watchlist.length > 0)
			sections.push({
				title: T.my_list,
				items: watchlist.map((w) => ({ ...w, id: w.media_id })),
				isGrid: false,
			});

		sections.push({
			title: `Top 10 — ${currentType === "movie" ? "Films" : currentType === "tv" ? "Séries" : currentType.toUpperCase()}`,
			items: (trendingData.results?.slice(0, 10) || []).map((it) => ({
				...it,
				media_type: currentType,
			})),
			isTop10: true,
		});

		const topGenres = GENRES[currentType]?.slice(0, 4) || [];
		const genreResults = await Promise.all(
			topGenres.map((g) => getData(currentType, g.id.toString())),
		);

		topGenres.forEach((g, idx) => {
			sections.push({
				title: g.name,
				items: (genreResults[idx].results || []).map((it) => ({
					...it,
					media_type: currentType,
				})),
				isGrid: false,
			});
		});
	}

	const getGenreFilterUrl = (targetTypeOrId, maybeGenreId) => {
		// Gère l'appel à 1 paramètre getGenreFilterUrl(id) ou à 2 paramètres getGenreFilterUrl(type, id)
		const targetType =
			maybeGenreId !== undefined ? targetTypeOrId : currentType;
		const genreId = maybeGenreId !== undefined ? maybeGenreId : targetTypeOrId;

		if (genreId === undefined || genreId === null)
			return `/?type=${targetType}`;
		const strId = genreId.toString();
		let updatedTags;

		if (currentType === targetType) {
			if (selectedTags.includes(strId)) {
				updatedTags = selectedTags.filter((id) => id !== strId);
			} else {
				if (selectedTags.length >= 2) {
					updatedTags = [selectedTags[1], strId];
				} else {
					updatedTags = [...selectedTags, strId];
				}
			}
		} else {
			updatedTags = [strId];
		}

		const params = new URLSearchParams({
			type: targetType,
			...(updatedTags.length > 0 ? { genre: updatedTags.join(",") } : {}),
		});
		return `/?${params.toString()}`;
	};

	const pageLink = (p) => {
		const params = new URLSearchParams({
			type: currentType,
			q: query,
			...(genreParam ? { genre: genreParam } : {}),
			page: p,
		});
		return `/?${params.toString()}`;
	};

	return (
		<main className="min-h-screen bg-black text-white selection:bg-red-600 pb-32 md:pb-20 overflow-x-hidden font-sans">
			{/* ── HEADER DESKTOP (Style Sobre KATCH) ── */}
			<header className="fixed top-0 w-full z-50 bg-black/85 backdrop-blur-md border-b border-red-900/40 hidden md:block">
				<div className="px-6 md:px-12 py-4 flex justify-between items-center gap-4">
					<Link href="/">
						<h1 className="text-4xl font-black uppercase italic tracking-tighter text-red-600 transform -skew-x-6 pr-2">
							KATCH
						</h1>
					</Link>

					<nav className="flex items-center gap-6 text-xs font-black uppercase italic tracking-widest">
						{["all", "movie", "tv", "anime", "kdrama"].map((type) => (
							<div key={type} className="group relative py-2">
								<Link
									href={`/?type=${type}`}
									className={`${
										currentType === type
											? "text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]"
											: "text-gray-400"
									} hover:text-white group-hover:text-red-500 transition-colors py-2`}
								>
									{type === "all"
										? T.home
										: type === "movie"
											? T.movies
											: type === "tv"
												? T.series
												: type === "anime"
													? T.animes
													: "K-DRAMAS"}
								</Link>

								{/* Menu déroulant avec pont invisible pour empêcher la fermeture au survol */}
								{type !== "all" && (
									<div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 hidden group-hover:block w-[320px] z-50">
										<div className="bg-zinc-950 border border-red-900/40 rounded-sm shadow-2xl p-2.5 grid grid-cols-2 gap-2">
											{GENRES[type]?.map((g) => {
												const isSelected =
													currentType === type &&
													selectedTags.includes(g.id.toString());
												return (
													<Link
														key={g.id}
														href={getGenreFilterUrl(type, g.id)}
														className={`px-3 py-2 text-[10px] font-black italic uppercase rounded-sm truncate transition-colors text-center ${
															isSelected
																? "bg-red-600 text-white"
																: "bg-black text-white hover:bg-red-600 hover:text-white"
														}`}
													>
														{g.name}
													</Link>
												);
											})}
										</div>
									</div>
								)}
							</div>
						))}

						{/* Onglet Historique uniquement affiché si connecté */}
						<SignedIn>
							<Link
								href="/watchlist"
								className="text-zinc-400 hover:text-white hover:text-red-500 transition-colors border-l border-zinc-800 pl-4"
							>
								MA LISTE
							</Link>
							<Link
								href="/history"
								className="text-zinc-400 hover:text-white hover:text-red-500 transition-colors"
							>
								HISTORIQUE
							</Link>
						</SignedIn>
					</nav>

					<div className="flex items-center gap-4">
						<form action="/" method="GET" className="relative w-64">
							<input type="hidden" name="type" value={currentType} />
							<input
								type="text"
								name="q"
								placeholder={T.search}
								defaultValue={query}
								className="w-full bg-zinc-900/90 border border-red-900/30 rounded-sm px-4 py-2 text-[10px] md:text-xs font-bold focus:outline-none focus:border-red-600 uppercase italic placeholder:text-zinc-600"
							/>
						</form>
						<SignedOut>
							<SignInButton mode="modal">
								<button className="text-[10px] font-black uppercase italic bg-white text-black px-4 py-2 rounded-sm hover:bg-red-600 hover:text-white transition-all whitespace-nowrap">
									LOGIN
								</button>
							</SignInButton>
						</SignedOut>
						<SignedIn>
							<UserButton afterSignOutUrl="/" />
						</SignedIn>
					</div>
				</div>
			</header>

			{/* ── HEADER MOBILE ── */}
			<header className="md:hidden fixed top-0 w-full z-50 bg-gradient-to-b from-black via-black/90 to-transparent">
				<div className="px-4 py-3 flex justify-between items-center">
					<Link href="/">
						<h1 className="text-3xl font-black uppercase italic tracking-tighter text-red-600 transform -skew-x-6">
							KATCH
						</h1>
					</Link>
					<div className="flex items-center gap-3">
						<SignedIn>
							<UserButton afterSignOutUrl="/" />
						</SignedIn>
						<SignedOut>
							<SignInButton mode="modal">
								<button className="text-[10px] font-black uppercase bg-white text-black px-3 py-1.5 rounded-sm">
									LOGIN
								</button>
							</SignInButton>
						</SignedOut>
					</div>
				</div>
				<div className="px-4 pb-2">
					<form action="/" method="GET" className="relative w-full">
						<input type="hidden" name="type" value={currentType} />
						<input
							type="text"
							name="q"
							placeholder={T.search}
							defaultValue={query}
							className="w-full bg-zinc-900/90 border border-red-900/30 rounded-sm px-4 py-2 text-[10px] md:text-xs font-bold focus:outline-none focus:border-red-600 uppercase italic placeholder:text-zinc-600"
						/>
					</form>
				</div>
			</header>

			{/* ── HERO EXACT DE TA CAPTURE (Avec Titre Penché & Description) ── */}
			{!query && heroItem && (
				<section className="relative w-full h-[72vh] md:h-[86vh] flex items-end pb-12 md:pb-20 px-6 md:px-12">
					<div className="absolute inset-0">
						<img
							src={`https://image.tmdb.org/t/p/original${heroItem.poster_path}`}
							className="md:hidden w-full h-full object-cover opacity-65"
							alt=""
						/>
						<img
							src={`https://image.tmdb.org/t/p/original${heroItem.backdrop_path}`}
							className="hidden md:block w-full h-full object-cover opacity-60"
							alt=""
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
					</div>

					<div className="relative z-10 w-full max-w-3xl text-center md:text-left">
						<h2 className="text-4xl md:text-8xl font-black uppercase italic mb-3 leading-none transform -skew-x-6 drop-shadow-2xl tracking-tighter">
							{heroItem.title || heroItem.name}
						</h2>
						{heroItem.overview && (
							<p className="line-clamp-2 md:line-clamp-3 text-zinc-300 text-xs md:text-sm font-medium mb-6 drop-shadow-md max-w-xl">
								{heroItem.overview}
							</p>
						)}
						<Link
							href={`/watch/${heroItem.id}?type=${currentType === "all" ? heroItem.media_type || "movie" : currentType}`}
						>
							<button className="bg-red-600 text-white px-8 md:px-12 py-3 md:py-4 font-black text-sm md:text-xl uppercase italic rounded-sm hover:scale-105 transition-all shadow-lg shadow-red-900/50">
								{T.watch}
							</button>
						</Link>
					</div>
				</section>
			)}

			{/* ── CONTENU ── */}
			<div
				className={`${!query && heroItem ? "-mt-10" : "pt-32"} relative z-20 flex flex-col gap-10`}
			>
				{/* ── BARRE MULTI-TAGS ── */}
				{currentType !== "all" && !query && (
					<section className="px-4 md:px-12 pt-8 md:pt-2">
						<div className="flex flex-col gap-2 border-b border-red-900/30 pb-4">
							<div className="flex justify-between items-center">
								<span className="text-[10px] md:text-xs font-black uppercase italic text-red-600">
									Filtres (Combine jusqu'à 2 tags) :
								</span>
								{selectedTags.length > 0 && (
									<Link
										href={`/?type=${currentType}`}
										className="text-[9px] uppercase tracking-widest text-zinc-400 hover:text-white underline"
									>
										Réinitialiser
									</Link>
								)}
							</div>

							<div className="flex flex-wrap gap-2 md:gap-3 items-center mt-1">
								<Link
									href={`/?type=${currentType}`}
									className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-black uppercase italic rounded-sm transition-all border ${
										selectedTags.length === 0
											? "bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]"
											: "bg-black/50 border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
									}`}
								>
									Tous
								</Link>

								{GENRES[currentType]?.map((g) => {
									const isSelected = selectedTags.includes(g.id.toString());
									return (
										<Link
											key={g.id}
											href={getGenreFilterUrl(currentType, g.id)}
											className={`px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-black uppercase italic rounded-sm transition-all border ${
												isSelected
													? "bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] scale-105"
													: "bg-black/50 border-white/10 text-zinc-400 hover:text-white hover:border-white/30"
											}`}
										>
											{g.name} {isSelected && "✕"}
										</Link>
									);
								})}
							</div>
						</div>
					</section>
				)}

				{/* ── SECTIONS ── */}
				{sections.map((sec, idx) => (
					<section key={idx} className="px-4 md:px-12">
						<h3 className="text-lg md:text-2xl font-black uppercase italic mb-4 flex items-center gap-2 tracking-tight">
							<span className="text-red-600">///</span> {sec.title}
						</h3>

						{sec.isGrid ? (
							<>
								{sec.items.length === 0 ? (
									<p className="text-zinc-500 font-black uppercase italic text-sm">
										{T.no_results}
									</p>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-6">
										{sec.items.map((it) => (
											<PosterCard
												key={it.id}
												item={it}
												currentType={currentType}
												isGrid={true}
											/>
										))}
									</div>
								)}

								{sec.totalPages > 1 && (
									<div className="flex items-center justify-center gap-4 mt-10">
										{sec.currentPage > 1 && (
											<Link href={pageLink(sec.currentPage - 1)}>
												<button className="px-6 py-2 bg-zinc-900 border border-zinc-800 font-black text-xs uppercase hover:bg-red-600 hover:border-red-600 transition-all rounded-sm">
													{T.prev_page}
												</button>
											</Link>
										)}
										<span className="text-xs font-black text-zinc-500 uppercase">
											{sec.currentPage} / {sec.totalPages}
										</span>
										{sec.currentPage < sec.totalPages && (
											<Link href={pageLink(sec.currentPage + 1)}>
												<button className="px-6 py-2 bg-zinc-900 border border-zinc-800 font-black text-xs uppercase hover:bg-red-600 hover:border-red-600 transition-all rounded-sm">
													{T.next_page}
												</button>
											</Link>
										)}
									</div>
								)}
							</>
						) : sec.isTop10 ? (
							/* Carrousel Top 10 géant sans coupure verticale */
							<div className="flex overflow-x-auto overflow-y-hidden gap-8 md:gap-12 pb-6 pt-4 custom-scrollbar h-[320px] md:h-[400px] items-end">
								{sec.items.map((it, itemIdx) => (
									<Top10Card
										key={it.id}
										item={it}
										rank={itemIdx + 1}
										currentType={currentType}
									/>
								))}
							</div>
						) : (
							/* Rangée Standard */
							<div className="flex overflow-x-auto overflow-y-hidden gap-3 md:gap-4 pb-4 pt-2 custom-scrollbar">
								{sec.items.map((it) => (
									<PosterCard
										key={it.id}
										item={it}
										currentType={currentType}
										isGrid={false}
									/>
								))}
							</div>
						)}
					</section>
				))}
			</div>

			{/* ── BOTTOM NAV MOBILE ── */}
			<nav className="md:hidden fixed bottom-0 w-full z-50 bg-black/95 backdrop-blur-md border-t border-red-900/50 flex justify-around items-center py-4 text-[10px] sm:text-xs font-black uppercase italic tracking-widest">
				{["all", "movie", "tv", "anime", "kdrama"].map((type) => (
					<Link
						key={type}
						href={`/?type=${type}`}
						className={`${
							currentType === type
								? "text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.8)] scale-105"
								: "text-gray-400"
						} inline-block hover:text-white transition-all`}
					>
						{type === "all"
							? T.home
							: type === "movie"
								? T.movies
								: type === "tv"
									? T.series
									: type === "anime"
										? T.animes
										: "K-DRAMAS"}
					</Link>
				))}

				{/* Lien Historique Mobile */}
				<SignedIn>
					<Link
						href="/watchlist"
						className="text-zinc-400 hover:text-white hover:text-red-500 transition-colors border-l border-zinc-800 pl-4"
					>
						LISTE
					</Link>
					<Link
						href="/history"
						className="text-zinc-400 hover:text-white hover:text-red-500 transition-colors"
					>
						VU
					</Link>
				</SignedIn>
			</nav>
		</main>
	);
}

// ─── CARTE POSTER STANDARD (AGRANDIE DE 33% SUR MOBILE) ─────────────────────────
const PosterCard = ({ item, currentType, isGrid }) => {
	const mediaType =
		item.media_type ||
		(currentType === "anime"
			? "anime"
			: currentType === "kdrama"
				? "kdrama"
				: currentType) ||
		"movie";
	const watchUrl = item.progress
		? `/watch/${item.id}?type=${mediaType}&s=${item.progress.split(" ")[0].replace("S", "")}&e=${item.progress.split(" ")[1].replace("E", "")}`
		: `/watch/${item.id}?type=${mediaType}`;

	return (
		<Link
			href={watchUrl}
			className={`group flex flex-col gap-2 transition-transform duration-300 ease-out md:hover:scale-105 md:hover:z-30 will-change-transform ${
				isGrid ? "w-full" : "flex-none w-[153px] md:w-[175px]"
			}`}
		>
			<div className="relative aspect-[2/3] overflow-hidden rounded-sm shadow-lg border border-transparent group-hover:border-red-600 transition-colors duration-200 bg-zinc-900 shadow-black/80">
				{item.progress && (
					<div className="absolute top-1 left-1 bg-red-600 text-white px-1.5 py-0.5 text-[7px] md:text-[9px] font-black uppercase rounded-xs z-10">
						{item.progress}
					</div>
				)}
				<img
					src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
					alt={item.title || item.name || ""}
					className="w-full h-full object-cover"
				/>
			</div>
			<h4 className="font-bold text-[9px] md:text-xs uppercase text-zinc-400 group-hover:text-white truncate transition-colors">
				{item.title || item.name}
			</h4>
		</Link>
	);
};

// ─── CARTE TOP 10 GÉANTE (STYLE NETFLIX XXL) ─────────────────────────────────
const Top10Card = ({ item, rank, currentType }) => {
	const mediaType =
		item.media_type ||
		(currentType === "anime"
			? "anime"
			: currentType === "kdrama"
				? "kdrama"
				: currentType) ||
		"movie";
	const watchUrl = `/watch/${item.id}?type=${mediaType}`;

	return (
		<Link
			href={watchUrl}
			className="group flex-none relative flex items-end pl-14 md:pl-20 w-[240px] md:w-[310px] transition-transform duration-300 ease-out md:hover:scale-105 will-change-transform"
		>
			{/* Chiffre XXL avec double contour contrasté */}
			<span
				className="absolute left-0 -bottom-4 text-[160px] md:text-[220px] font-black leading-none select-none pointer-events-none text-black z-0"
				style={{
					WebkitTextStroke: "4px #52525b",
					filter: "drop-shadow(0 0 12px rgba(0,0,0,0.9))",
				}}
			>
				{rank}
			</span>

			{/* Affiche agrandie conservant son ratio 2/3 */}
			<div className="relative z-10 w-[185px] md:w-[240px] aspect-[2/3] shrink-0 overflow-hidden rounded-sm shadow-2xl bg-zinc-900 border border-zinc-800 group-hover:border-red-600 transition-colors duration-200">
				<img
					src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
					alt={item.title || item.name || ""}
					className="w-full h-full object-cover"
				/>
			</div>
		</Link>
	);
};

async function getRecommendationsForMedia(id, type = "movie") {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY; //
	const endpoint = type === "movie" ? "movie" : "tv"; //[cite: 3]
	const res = await fetch(
		`https://api.themoviedb.org/3/${endpoint}/${id}/recommendations?language=fr-FR&api_key=${apiKey}`, //[cite: 3]
		{ next: { revalidate: 3600 } },
	);
	if (!res.ok) return []; //[cite: 3]
	const data = await res.json(); //[cite: 3]
	return (data.results || []).filter((item) => item.poster_path); //[cite: 3]
}
