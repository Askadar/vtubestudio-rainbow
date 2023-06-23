/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string
	readonly VITE_TWITCH_CLIENT_ID: string
	readonly VITE_TWITCH_REDIRECT_URI: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
