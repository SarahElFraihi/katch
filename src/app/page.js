import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getUserHistory, getUserWatchlist } from "@/lib/actions";

// 1. DICTIONNAIRE DE TRADUCTION
const TRANSLATIONS = {
	fr: {
		home: "Accueil",
		movies: "Films",
		series: "Séries",
		animes: "Animes",
		search: "RECHERCHER...",
		trending: "Tendances",
		results: "Résultats :",
		no_results: "Aucun contenu trouvé...",
		watch: "▶ REGARDER",
		gift: "Cadeau",
		genres: "Genres",
		login: "Connexion",
		continue_watching: "REPRENDRE",
		my_list: "MA LISTE",
		prev_page: "← PRÉCÉDENT",
		next_page: "SUIVANT →",
	},
	en: {
		home: "Home",
		movies: "Movies",
		series: "Series",
		animes: "Anime",
		search: "SEARCH...",
		trending: "Trending",
		results: "Results:",
		no_results: "No content found...",
		watch: "▶ WATCH NOW",
		gift: "Free",
		genres: "Genres",
		login: "Login",
		continue_watching: "CONTINUE WATCHING",
		my_list: "MY LIST",
		prev_page: "← PREVIOUS",
		next_page: "NEXT →",
	},
};

const GENRES = {
	movie: [
		{ id: 28, name: { fr: "Action", en: "Action" } },
		{ id: 12, name: { fr: "Aventure", en: "Adventure" } },
		{ id: 16, name: { fr: "Animation", en: "Animation" } },
		{ id: 35, name: { fr: "Comédie", en: "Comedy" } },
		{ id: 80, name: { fr: "Crime", en: "Crime" } },
		{ id: 18, name: { fr: "Drame", en: "Drama" } },
		{ id: 14, name: { fr: "Fantastique", en: "Fantasy" } },
		{ id: 27, name: { fr: "Horreur", en: "Horror" } },
		{ id: 9648, name: { fr: "Mystère", en: "Mystery" } },
		{ id: 10749, name: { fr: "Romance", en: "Romance" } },
		{ id: 878, name: { fr: "Science-Fiction", en: "Sci-Fi" } },
		{ id: 53, name: { fr: "Thriller", en: "Thriller" } },
	],
	tv: [
		{ id: 10759, name: { fr: "Action & Aventure", en: "Action & Adventure" } },
		{ id: 16, name: { fr: "Animation", en: "Animation" } },
		{ id: 35, name: { fr: "Comédie", en: "Comedy" } },
		{ id: 80, name: { fr: "Crime", en: "Crime" } },
		{ id: 99, name: { fr: "Documentaire", en: "Documentary" } },
		{ id: 18, name: { fr: "Drame", en: "Drama" } },
		{ id: 9648, name: { fr: "Mystère", en: "Mystery" } },
		{ id: 10765, name: { fr: "Sci-Fi & Fantasy", en: "Sci-Fi & Fantasy" } },
	],
	anime: [
		{ id: 10759, name: { fr: "Action", en: "Action" } },
		{ id: 35, name: { fr: "Comédie", en: "Comedy" } },
		{ id: 18, name: { fr: "Drame", en: "Drama" } },
		{ id: 10765, name: { fr: "Fantaisie", en: "Fantasy" } },
		{ id: 9648, name: { fr: "Mystère", en: "Mystery" } },
		{ id: 10751, name: { fr: "Famille", en: "Family" } },
	],
};

async function getData(
	type = "all",
	query = "",
	genreId = "",
	lang = "fr",
	page = 1,
) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const tmdbLang = lang === "fr" ? "fr-FR" : "en-US";
	let url = "";

	if (query) {
		url = `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=${tmdbLang}&query=${encodeURIComponent(query)}&page=${page}`;
	} else if (genreId) {
		const baseType = type === "anime" ? "tv" : type;
		const animeFilter =
			type === "anime" ? "&with_original_language=ja&with_genres=16" : "";
		url = `https://api.themoviedb.org/3/discover/${baseType}?api_key=${apiKey}&language=${tmdbLang}&with_genres=${genreId}${animeFilter}&sort_by=popularity.desc&page=${page}`;
	} else if (type === "anime") {
		url = `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=${tmdbLang}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`;
	} else if (type === "all") {
		url = `https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}&language=${tmdbLang}&page=${page}`;
	} else {
		url = `https://api.themoviedb.org/3/trending/${type}/week?api_key=${apiKey}&language=${tmdbLang}&page=${page}`;
	}

	const res = await fetch(url, { next: { revalidate: 3600 } });
	if (!res.ok) throw new Error("Erreur de récupération");
	const data = await res.json();

	if (data.results) {
		data.results = data.results.filter((item) => item.media_type !== "person");
	}

	return data;
}

export default async function Home({ searchParams }) {
	const sp = await searchParams;
	const lang = sp?.lang || "fr";
	const currentType = sp?.type || "all";
	const query = sp?.q || "";
	const genreId = sp?.genre || "";
	const currentPage = parseInt(sp?.page) || 1;
	const t = TRANSLATIONS[lang];

	let sections = [];
	let heroItem = null;
	const isSearchOrGenre = !!(query || genreId);

	// --- 1. RÉCUPÉRATION DES DONNÉES UTILISATEUR ---
	const { userId } = await auth();
	let history = [];
	let watchlist = [];

	if (userId && !isSearchOrGenre) {
		history = await getUserHistory();
		watchlist = await getUserWatchlist();

		// 🔥 CORRECTION : Filtrage strict par type (anime, tv ou movie)
		if (currentType !== "all") {
			history = history.filter((h) => h.media_type === currentType);
			watchlist = watchlist.filter((w) => w.media_type === currentType);
		}
	}

	// --- 2. LOGIQUE D'AFFICHAGE ---
	if (isSearchOrGenre) {
		const data = await getData(
			currentType === "all" ? "movie" : currentType,
			query,
			genreId,
			lang,
			currentPage,
		);
		let items = data.results || [];

		if (genreId && items.length > 0 && currentPage === 1) {
			heroItem = items[0];
			items = items.slice(1);
		}

		if (!query) {
			const perfectCount = Math.floor(items.length / 6) * 6;
			if (perfectCount > 0) items = items.slice(0, perfectCount);
		}

		sections.push({
			title: query
				? `${t.results} "${query}"`
				: [...GENRES.movie, ...GENRES.tv, ...GENRES.anime].find(
						(g) => g.id.toString() === genreId,
					)?.name[lang],
			items: items.map((item) => ({
				...item,
				media_type:
					currentType === "anime" ? "anime" : item.media_type || currentType,
			})), // On force le type anime
			isGrid: true,
			totalPages: data.total_pages > 500 ? 500 : data.total_pages,
			currentPage: currentPage,
		});
	} else if (currentType === "all") {
		const trendingData = await getData("all", "", "", lang);
		heroItem = trendingData.results?.[0];

		if (history.length > 0) {
			sections.push({
				title: t.continue_watching,
				items: history.map((h) => ({
					id: h.media_id,
					title: h.title,
					poster_path: h.poster_path,
					media_type: h.media_type,
					progress:
						h.media_type === "tv" || h.media_type === "anime"
							? `S${h.season} E${h.episode}`
							: null,
				})),
				isGrid: false,
			});
		}
		if (watchlist.length > 0) {
			sections.push({
				title: t.my_list,
				items: watchlist.map((w) => ({
					id: w.media_id,
					title: w.title,
					poster_path: w.poster_path,
					media_type: w.media_type,
				})),
				isGrid: false,
			});
		}

		const trendingMovies = await getData("movie", "", "", lang);
		sections.push({
			title: `${t.trending} - ${t.movies}`,
			items: trendingMovies.results,
			isGrid: false,
		});

		const trendingTV = await getData("tv", "", "", lang);
		sections.push({
			title: `${t.trending} - ${t.series}`,
			items: trendingTV.results,
			isGrid: false,
		});
	} else {
		// MODE SPÉCIFIQUE (SÉRIES OU ANIMES)
		const trendingData = await getData(currentType, "", "", lang);
		heroItem = trendingData.results?.[0];

		if (history.length > 0) {
			sections.push({
				title: t.continue_watching,
				items: history.map((h) => ({
					id: h.media_id,
					title: h.title,
					poster_path: h.poster_path,
					media_type: h.media_type,
					progress: `S${h.season} E${h.episode}`,
				})),
				isGrid: false,
			});
		}
		if (watchlist.length > 0) {
			sections.push({
				title: t.my_list,
				items: watchlist.map((w) => ({
					id: w.media_id,
					title: w.title,
					poster_path: w.poster_path,
					media_type: w.media_type,
				})),
				isGrid: false,
			});
		}

		sections.push({
			title: t.trending,
			items: (trendingData.results?.slice(1) || []).map((item) => ({
				...item,
				media_type: currentType,
			})), // On force le type Anime ou TV
			isGrid: false,
		});

		const topGenres = GENRES[currentType].slice(0, 4);
		const genreResults = await Promise.all(
			topGenres.map((g) => getData(currentType, "", g.id.toString(), lang)),
		);

		topGenres.forEach((g, index) => {
			sections.push({
				title: g.name[lang],
				items: (genreResults[index].results || []).map((item) => ({
					...item,
					media_type: currentType,
				})), // On force le type
				isGrid: false,
			});
		});
	}

	return (
		<main className="min-h-screen bg-black text-white selection:bg-red-600 pb-20 overflow-x-hidden">
			<header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-red-900/50">
				<div className="px-6 md:px-12 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
					<Link href={`/?lang=${lang}`}>
						<h1 className="text-4xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent transform -skew-x-6 pr-2">
							KATCH
						</h1>
					</Link>
					<nav className="flex items-center gap-6 text-xs font-black uppercase italic tracking-widest">
						{["all", "movie", "tv", "anime"].map((type) => (
							<div key={type} className="group relative py-2">
								<Link
									href={`/?type=${type}&lang=${lang}`}
									className={`${currentType === type && !genreId ? "text-red-600" : "text-gray-400"} hover:text-white transition-colors`}
								>
									{
										t[
											type === "all"
												? "home"
												: type === "movie"
													? "movies"
													: type === "tv"
														? "series"
														: "animes"
										]
									}
								</Link>
								{type !== "all" && (
									<div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 hidden group-hover:block w-[320px]">
										<div className="bg-zinc-900 border border-red-900/50 rounded-sm shadow-2xl p-3 grid grid-cols-2 gap-2">
											{GENRES[type].map((g) => (
												<Link
													key={g.id}
													href={`/?type=${type}&genre=${g.id}&lang=${lang}`}
													className="px-3 py-2 bg-black hover:bg-red-600 hover:text-white transition-colors text-[10px] rounded-sm truncate"
												>
													{g.name[lang]}
												</Link>
											))}
										</div>
									</div>
								)}
							</div>
						))}
					</nav>
					<div className="flex items-center gap-4">
						<div className="flex bg-zinc-900 border border-red-900/30 rounded-sm p-1">
							<Link
								href={`/?lang=fr&type=${currentType}${query ? `&q=${query}` : ""}`}
								className={`px-2 py-1 text-[10px] font-bold ${lang === "fr" ? "bg-red-600 text-white" : "text-zinc-500"}`}
							>
								FR
							</Link>
							<Link
								href={`/?lang=en&type=${currentType}${query ? `&q=${query}` : ""}`}
								className={`px-2 py-1 text-[10px] font-bold ${lang === "en" ? "bg-red-600 text-white" : "text-zinc-500"}`}
							>
								EN
							</Link>
						</div>
						<div className="flex items-center gap-2">
							<form action="/" method="GET" className="relative w-48">
								<input type="hidden" name="lang" value={lang} />
								<input
									type="hidden"
									name="type"
									value={currentType === "all" ? "movie" : currentType}
								/>
								<input
									type="text"
									name="q"
									placeholder={t.search}
									defaultValue={query}
									className="w-full bg-zinc-900 border border-red-900/30 rounded-sm px-4 py-2 text-xs font-bold focus:outline-none focus:border-red-600 uppercase italic"
								/>
							</form>
							<SignedOut>
								<SignInButton mode="modal">
									<button className="text-[10px] font-black uppercase italic bg-white text-black px-4 py-2 rounded-sm hover:bg-red-600 hover:text-white transition-all whitespace-nowrap">
										{t.login}
									</button>
								</SignInButton>
							</SignedOut>
							<SignedIn>
								<UserButton afterSignOutUrl={`/?lang=${lang}`} />
							</SignedIn>
						</div>
					</div>
				</div>
			</header>

			{!query && heroItem && (
				<section className="relative w-full h-[85vh] flex items-end pb-20 px-6 md:px-12">
					<div className="absolute inset-0 z-0">
						<img
							src={`https://image.tmdb.org/t/p/original${heroItem.backdrop_path}`}
							alt=""
							className="w-full h-full object-cover opacity-60"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black via-red-950/40 to-transparent" />
					</div>
					<div className="relative z-10 max-w-4xl">
						<h2 className="text-5xl md:text-8xl font-black uppercase italic mb-4 leading-none transform -skew-x-3 pr-4">
							{heroItem.title || heroItem.name}
						</h2>
						<Link
							href={`/watch/${heroItem.id}?type=${currentType === "all" ? heroItem.media_type || "movie" : currentType}&lang=${lang}`}
						>
							<button className="bg-red-600 text-white px-10 py-4 font-black text-xl uppercase tracking-wider rounded-sm hover:bg-red-500 transition-all hover:scale-105 border-b-4 border-red-900 shadow-lg active:translate-y-1 active:border-b-0">
								{t.watch}
							</button>
						</Link>
					</div>
				</section>
			)}

			<div
				className={`${!query && heroItem ? "-mt-10" : "pt-32"} relative z-20 flex flex-col gap-12`}
			>
				{sections.map((section, index) => (
					<section key={index} className="px-6 md:px-12">
						<h3 className="text-2xl font-black uppercase italic mb-6 flex items-center gap-3">
							<span className="text-red-600">///</span> {section.title}
						</h3>
						{section.isGrid ? (
							<>
								<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
									{section.items.map((item) => (
										<PosterCard
											key={item.id}
											item={item}
											currentType={currentType}
											lang={lang}
											isGrid={true}
										/>
									))}
								</div>
								{section.totalPages > 1 && (
									<div className="flex justify-center items-center gap-4 mt-16 mb-8">
										{section.currentPage > 1 ? (
											<Link
												href={`/?lang=${lang}&type=${currentType}${query ? `&q=${query}` : ""}${genreId ? `&genre=${genreId}` : ""}&page=${section.currentPage - 1}`}
											>
												<button className="px-6 py-3 text-xs font-black uppercase tracking-widest italic bg-zinc-900 text-white border border-red-900/30 rounded-sm hover:bg-red-600 uppercase italic">
													{t.prev_page}
												</button>
											</Link>
										) : (
											<div className="w-[140px]"></div>
										)}
										<span className="text-zinc-500 font-black italic px-4">
											{section.currentPage} / {section.totalPages}
										</span>
										{section.currentPage < section.totalPages ? (
											<Link
												href={`/?lang=${lang}&type=${currentType}${query ? `&q=${query}` : ""}${genreId ? `&genre=${genreId}` : ""}&page=${section.currentPage + 1}`}
											>
												<button className="px-6 py-3 text-xs font-black uppercase tracking-widest italic bg-red-600 text-white border-b-2 border-red-900 rounded-sm hover:scale-105 uppercase italic">
													{t.next_page}
												</button>
											</Link>
										) : (
											<div className="w-[140px]"></div>
										)}
									</div>
								)}
							</>
						) : (
							<div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar">
								{section.items.map((item) => (
									<PosterCard
										key={item.id}
										item={item}
										currentType={currentType}
										lang={lang}
										isGrid={false}
									/>
								))}
							</div>
						)}
					</section>
				))}
			</div>
		</main>
	);
}

const PosterCard = ({ item, currentType, lang, isGrid }) => {
	// Construction du lien intelligent : si l'épisode est en cours, on reprend au bon endroit !
	const watchUrl = item.progress
		? `/watch/${item.id}?type=${item.media_type}&lang=${lang}&s=${item.progress.split(" ")[0].replace("S", "")}&e=${item.progress.split(" ")[1].replace("E", "")}`
		: `/watch/${item.id}?type=${item.media_type || (currentType === "anime" ? "anime" : currentType)}&lang=${lang}`;

	return (
		<Link
			href={watchUrl}
			className={`group flex flex-col gap-3 ${isGrid ? "w-full" : "flex-none w-[130px] sm:w-[150px] md:w-[170px] lg:w-[190px]"}`}
		>
			<div className="relative aspect-[2/3] overflow-hidden rounded-sm shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-red-600 ring-offset-2 ring-offset-black">
				{item.progress && (
					<div className="absolute top-2 left-2 bg-red-600/90 backdrop-blur-sm text-white px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-sm z-10 shadow-lg border border-red-900/50">
						{item.progress}
					</div>
				)}
				<img
					src={
						item.poster_path
							? `https://image.tmdb.org/t/p/w500${item.poster_path}`
							: "https://via.placeholder.com/500x750?text=KATCH"
					}
					alt=""
					className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
				/>
			</div>
			<h4 className="font-bold text-xs uppercase text-gray-400 truncate group-hover:text-red-500 transition-colors">
				{item.title || item.name}
			</h4>
		</Link>
	);
};
