import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Geist, Geist_Mono } from "next/font/google";
import SecurityShield from "@/components/SecurityShield";
import InstallPrompt from "@/components/InstallPrompt";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata = {
	title: "KATCH",
};

export default function RootLayout({ children }) {
	return (
		<ClerkProvider
			appearance={{
				baseTheme: dark,
				variables: {
					colorPrimary: "#dc2626", // Rouge KATCH
					colorBackground: "#0a0a0a", // Noir profond
					colorText: "white",
					borderRadius: "2px",
					fontFamily: "var(--font-geist-sans)",
				},
				elements: {
					card: "border border-red-900/30 shadow-2xl",
					headerTitle: "uppercase italic font-black tracking-tighter",
					socialButtonsBlockButton:
						"rounded-sm border-white/10 hover:bg-red-600 transition-all",
					formButtonPrimary:
						"bg-red-600 hover:bg-red-500 uppercase italic font-black shadow-[0_4px_0_rgb(153,27,27)] active:translate-y-1 active:shadow-none",
				},
			}}
		>
			<html lang="fr">
				<head>
					<link rel="manifest" href="/manifest.json" />
					<meta name="theme-color" content="#000000" />
				</head>
				<body
					className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}
				>
					<SecurityShield />
					<InstallPrompt />
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
