import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getUserHistory, getUserWatchlist } from "@/lib/actions";

// 1. TRADUCTIONS
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
		continue_watching: "REPRENDRE",
		my_list: "MA LISTE",
		prev_page: "←",
		next_page: "→",
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
		continue_watching: "CONTINUE WATCHING",
		my_list: "MY LIST",
		prev_page: "←",
		next_page: "→",
	},
};

// 2. GENRES
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
		{ id: 878, name: { fr: "SF", en: "Sci-Fi" } },
		{ id: 53, name: { fr: "Thriller", en: "Thriller" } },
	],
	tv: [
		{ id: 10759, name: { fr: "Action", en: "Action" } },
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

// 3. RÉCUPÉRATION DATA
async function getData(
	type = "all",
	query = "",
	genreId = "",
	lang = "fr",
	page = 1,
) {
	const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
	const tmdbLang = lang === "fr" ? "fr-FR" : "en-US";

	const getUrl = (p) => {
		if (query) {
			let searchType = "multi";
			if (type === "movie") searchType = "movie";
			if (type === "tv" || type === "anime") searchType = "tv";
			return `https://api.themoviedb.org/3/search/${searchType}?api_key=${apiKey}&language=${tmdbLang}&query=${encodeURIComponent(query)}&page=${p}`;
		}
		if (genreId) {
			const baseType = type === "anime" ? "tv" : type;
			const animeFilter =
				type === "anime" ? "&with_original_language=ja&with_genres=16" : "";
			return `https://api.themoviedb.org/3/discover/${baseType}?api_key=${apiKey}&language=${tmdbLang}&with_genres=${genreId}${animeFilter}&sort_by=popularity.desc&page=${p}`;
		}
		if (type === "anime")
			return `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&language=${tmdbLang}&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${p}`;
		if (type === "all")
			return `https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}&language=${tmdbLang}&page=${p}`;
		return `https://api.themoviedb.org/3/trending/${type}/week?api_key=${apiKey}&language=${tmdbLang}&page=${p}`;
	};

	const [res1, res2] = await Promise.all([
		fetch(getUrl(page * 2 - 1)),
		fetch(getUrl(page * 2)),
	]);
	const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
	let combined = [...(data1.results || []), ...(data2.results || [])];

	const filtered = combined.filter(
		(item) =>
			item.poster_path !== null &&
			item.backdrop_path !== null &&
			item.media_type !== "person",
	);

	const uniqueResults = Array.from(
		new Map(filtered.map((item) => [item.id, item])).values(),
	);

	return {
		results: uniqueResults,
		total_pages: Math.ceil((data1.total_results || 0) / 18),
	};
}

// 4. COMPOSANT HOME
export default async function Home({ searchParams }) {
	const sp = await searchParams;
	const lang = sp?.lang || "fr";
	const currentType = sp?.type || "all";
	const query = sp?.q || "";
	const genreId = sp?.genre || "";
	const currentPage = parseInt(sp?.page) || 1;
	const t = TRANSLATIONS[lang];

	const { userId } = await auth();
	let history = [];
	let watchlist = [];
	let sections = [];
	let heroItem = null;
	const isSearchOrGenre = !!(query || genreId);

	if (userId && !isSearchOrGenre) {
		const [h, w] = await Promise.all([getUserHistory(), getUserWatchlist()]);
		history =
			currentType !== "all" ? h.filter((x) => x.media_type === currentType) : h;
		watchlist =
			currentType !== "all" ? w.filter((x) => x.media_type === currentType) : w;
	}

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
		let finalCount =
			items.length >= 6
				? Math.floor(Math.min(items.length, 18) / 6) * 6
				: items.length;
		items = items.slice(0, finalCount);
		sections.push({
			title: query ? `${t.results} "${query}"` : "Exploration",
			items: items.map((it) => ({
				...it,
				media_type: currentType === "anime" ? "anime" : it.media_type,
			})),
			isGrid: true,
			totalPages: data.total_pages > 500 ? 500 : data.total_pages,
			currentPage,
		});
	} else if (currentType === "all") {
		const trendingData = await getData("all", "", "", lang);
		heroItem = trendingData.results?.[0];
		if (history.length > 0)
			sections.push({
				title: t.continue_watching,
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
				title: t.my_list,
				items: watchlist.map((w) => ({ ...w, id: w.media_id })),
				isGrid: false,
			});
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
		const trendingData = await getData(currentType, "", "", lang);
		heroItem = trendingData.results?.[0];
		if (history.length > 0)
			sections.push({
				title: t.continue_watching,
				items: history.map((h) => ({
					...h,
					id: h.media_id,
					progress: `S${h.season} E${h.episode}`,
				})),
				isGrid: false,
			});
		if (watchlist.length > 0)
			sections.push({
				title: t.my_list,
				items: watchlist.map((w) => ({ ...w, id: w.media_id })),
				isGrid: false,
			});
		sections.push({
			title: t.trending,
			items: (trendingData.results?.slice(1) || []).map((it) => ({
				...it,
				media_type: currentType,
			})),
			isGrid: false,
		});
		const topGenres = GENRES[currentType].slice(0, 4);
		const genreResults = await Promise.all(
			topGenres.map((g) => getData(currentType, "", g.id.toString(), lang)),
		);
		topGenres.forEach((g, idx) => {
			sections.push({
				title: g.name[lang],
				items: (genreResults[idx].results || []).map((it) => ({
					...it,
					media_type: currentType,
				})),
				isGrid: false,
			});
		});
	}

	return (
		<main className="min-h-screen bg-black text-white selection:bg-red-600 pb-32 md:pb-20 overflow-x-hidden">
			{/* HEADER DESKTOP */}
			<header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-red-900/50 hidden md:block">
				<div className="px-6 md:px-12 py-4 flex justify-between items-center gap-4">
					<Link href={`/?lang=${lang}`}>
						<h1 className="text-4xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-red-600 to-yellow-500 bg-clip-text text-transparent transform -skew-x-6 pr-2">
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
										LOGIN
									</button>
								</SignInButton>
							</SignedOut>
							<SignedIn>
								<UserButton afterSignOutUrl="/" />
							</SignedIn>
						</div>
					</div>
				</div>
			</header>

			{/* HEADER MOBILE */}
			<header className="md:hidden fixed top-0 w-full z-50 bg-gradient-to-b from-black via-black/80 to-transparent transition-all duration-300">
				<div className="px-4 py-3 flex justify-between items-center">
					<Link href={`/?lang=${lang}`}>
						<h1 className="text-3xl font-black uppercase italic tracking-tighter text-red-600 transform -skew-x-6">
							KATCH
						</h1>
					</Link>
					<div className="flex items-center gap-3">
						{/* BOUTON LANGUE MOBILE */}
						<div className="flex bg-zinc-900/80 border border-white/10 rounded-sm p-0.5 text-[8px] font-bold">
							<Link
								href={`/?lang=${lang === "fr" ? "en" : "fr"}&type=${currentType}${query ? `&q=${query}` : ""}`}
								className="px-2 py-1 bg-red-600 text-white rounded-sm uppercase"
							>
								{lang === "fr" ? "EN" : "FR"}
							</Link>
						</div>
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
					<form action="/" method="GET">
						<input type="hidden" name="lang" value={lang} />
						<input
							type="text"
							name="q"
							placeholder={t.search}
							defaultValue={query}
							className="w-full bg-zinc-900/80 border border-white/5 rounded-sm px-4 py-2 text-[10px] font-bold uppercase italic focus:border-red-600 outline-none"
						/>
					</form>
				</div>
			</header>

			{/* HERO */}
			{!query && heroItem && (
				<section className="relative w-full h-[70vh] md:h-[85vh] flex items-end pb-12 md:pb-20 px-6 md:px-12">
					<div className="absolute inset-0">
						<img
							src={`https://image.tmdb.org/t/p/original${heroItem.poster_path}`}
							className="md:hidden w-full h-full object-cover opacity-70"
							alt=""
						/>
						<img
							src={`https://image.tmdb.org/t/p/original${heroItem.backdrop_path}`}
							className="hidden md:block w-full h-full object-cover opacity-60"
							alt=""
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
					</div>
					<div className="relative z-10 w-full text-center md:text-left">
						<h2 className="text-4xl md:text-8xl font-black uppercase italic mb-4 leading-none transform -skew-x-3 drop-shadow-2xl">
							{heroItem.title || heroItem.name}
						</h2>
						<Link
							href={`/watch/${heroItem.id}?type=${currentType === "all" ? heroItem.media_type || "movie" : currentType}&lang=${lang}`}
						>
							<button className="bg-red-600 text-white px-8 md:px-12 py-3 md:py-4 font-black text-sm md:text-xl uppercase italic rounded-sm hover:scale-105 transition-all shadow-xl">
								{t.watch}
							</button>
						</Link>
					</div>
				</section>
			)}

			{/* SECTIONS CONTENU */}
			<div
				className={`${!query && heroItem ? "-mt-10" : "pt-32"} relative z-20 flex flex-col gap-10`}
			>
				{sections.map((sec, idx) => (
					<section key={idx} className="px-4 md:px-12">
						<h3 className="text-lg md:text-2xl font-black uppercase italic mb-4 flex items-center gap-2">
							<span className="text-red-600">///</span> {sec.title}
						</h3>
						{sec.isGrid ? (
							<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-6">
								{sec.items.map((it) => (
									<PosterCard
										key={it.id}
										item={it}
										currentType={currentType}
										lang={lang}
										isGrid={true}
									/>
								))}
							</div>
						) : (
							<div className="flex overflow-x-auto gap-3 md:gap-4 pb-4 custom-scrollbar">
								{sec.items.map((it) => (
									<PosterCard
										key={it.id}
										item={it}
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

			{/* BOTTOM NAV MOBILE */}
			<nav className="md:hidden fixed bottom-0 w-full z-50 bg-black/95 backdrop-blur-lg border-t border-white/10 px-6 py-3 flex justify-between items-center pb-8">
				{[
					{
						label: t.home,
						type: "all",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								strokeWidth="2"
								className="w-5 h-5"
							>
								<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
								<path d="M9 22V12h6v10" />
							</svg>
						),
					},
					{
						label: t.movies,
						type: "movie",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								strokeWidth="2"
								className="w-5 h-5"
							>
								<rect x="2" y="2" width="20" height="20" rx="2" />
								<path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
							</svg>
						),
					},
					{
						label: t.series,
						type: "tv",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								strokeWidth="2"
								className="w-5 h-5"
							>
								<rect x="2" y="7" width="20" height="15" rx="2" />
								<path d="M17 2l-5 5-5-5" />
							</svg>
						),
					},
					{
						label: t.animes,
						type: "anime",
						icon: (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								strokeWidth="2"
								className="w-5 h-5"
							>
								<path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" />
							</svg>
						),
					},
				].map((nav) => (
					<Link
						key={nav.type}
						href={`/?type=${nav.type}&lang=${lang}`}
						className={`flex flex-col items-center gap-1 ${currentType === nav.type ? "opacity-100 scale-110" : "opacity-50"}`}
					>
						<div
							className={
								currentType === nav.type ? "text-red-600" : "text-white"
							}
						>
							{nav.icon}
						</div>
						<span
							className={`text-[8px] font-black uppercase italic tracking-tighter ${currentType === nav.type ? "text-red-600" : "text-white"}`}
						>
							{nav.label}
						</span>
					</Link>
				))}
			</nav>
		</main>
	);
}

const PosterCard = ({ item, currentType, lang, isGrid }) => {
	const watchUrl = item.progress
		? `/watch/${item.id}?type=${item.media_type}&lang=${lang}&s=${item.progress.split(" ")[0].replace("S", "")}&e=${item.progress.split(" ")[1].replace("E", "")}`
		: `/watch/${item.id}?type=${item.media_type || (currentType === "anime" ? "anime" : currentType)}&lang=${lang}`;
	return (
		<Link
			href={watchUrl}
			className={`group flex flex-col gap-2 ${isGrid ? "w-full" : "flex-none w-[110px] md:w-[180px]"}`}
		>
			<div className="relative aspect-[2/3] overflow-hidden rounded-sm shadow-lg transition-all duration-300 md:group-hover:scale-105 md:group-hover:ring-2 group-hover:ring-red-600 ring-offset-2 ring-offset-black">
				{item.progress && (
					<div className="absolute top-1 left-1 bg-red-600 text-white px-1.5 py-0.5 text-[7px] md:text-[9px] font-black uppercase rounded-xs z-10">
						{item.progress}
					</div>
				)}
				<img
					src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
					alt=""
					className="w-full h-full object-cover"
				/>
			</div>
			<h4 className="font-bold text-[9px] md:text-xs uppercase text-zinc-400 truncate">
				{item.title || item.name}
			</h4>
		</Link>
	);
};
