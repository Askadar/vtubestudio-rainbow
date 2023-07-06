<template>
	<n-modal v-if="currentNews" v-model:show="modalShown" :mask-closable="false">
		<n-card
			style="width: 600px"
			:title="currentNews.title"
			:bordered="true"
			size="large"
			role="dialog"
			aria-modal="true"
			v-if="currentNews"
		>
			<template #default>
				<article>
					<p v-for="p in currentNews.description">{{ p }}</p>
				</article>
				<aside v-if="currentNews.links">
					<n-space vertical>
						<a v-for="link in currentNews.links" :href="link.href">{{ link.label }}</a>
					</n-space>
				</aside>
			</template>
			<template #footer>
				<n-space>
					<n-button v-if="news.length - 1 > updatesInfo.version" @click="nextPage" type="primary"
						>Next patch note</n-button
					>
					<n-button v-else v-if="news.length > updatesInfo.version" @click="nextPage" type="primary"
						>Got it!</n-button
					>
					<n-button @click="skipForNow">Skip for now</n-button>
					<n-button @click="dontBother" type="warning">Stop showing me this!11</n-button>
				</n-space>
			</template>
		</n-card>
	</n-modal>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed } from 'vue'
import { get, set } from './helpers'

interface Updates {
	version: number
	dontShow: boolean
}

interface NewsEntry {
	title: string
	description: string[]
	links?: { label: string; href: string }[]
}

const defaultUpdates: Updates = {
	version: 2,
	dontShow: false,
}

const news: NewsEntry[] = [
	{
		title: `Proper Customization Update`,
		description: [
			`So, ye, first decently major update that's not just fixing and patching up baseline purpose of this thing.`,
			`There shouldn't be much to say, you can now create your own unique pattern, be it for cool visual effect, or for dumb but oh so great memes; power is yours. And yeah, now I can also bother you with "patch notes" whenever I feel like it.`,
			`Some notes regarding gradient customization thing itself: it comes with decent defaults - 80% tint strength, full rainbow, somewhat softer colours than built in vtube studio _jeb mode (which is quite eye shattering tbh). There are tips in UI itself, but you can add stops (points that spread their colour around), remove them by dragging out, and rearrange however you want. Everything still works live as usual, so you can adjust and experiement with settings without going back and forth pausing and resuming the animation. There's also a slight bonus to quickly adjust how soft whole tint is in case you want more or less saturation without fiddling with each stop point.`,
			`I've also finally came and done twitter account, watch it get banned without phone number in a day. News, patches, etc might be posted there, but it's likely going to be just promo platform cause what else would you use twitter for. So, don't forget to smash that like button, ding-a-ling the bell, and links are in the description.`,
			`P.S. you have to uncheck 'Using built-in cycle' to access new features`,
		],
		links: [
			{ label: 'Twatter, go get it, son', href: 'https://twitter.com/ZN_Development' },
			{
				label: `Child support group (you're the child)`,
				href: import.meta.env.VITE_SUPPORT_URL,
			},
		],
	},
	{
		title: `Twitch Integration Update`,
		description: [
			`Helo yet again, magic of automation (and corporate tracking) is coming right to you!`,
			`New big thing is ability to authenticate with twitch, and select reward that will start Cycler when it's redeemed. Works nicely with automatic deactivation timer, letting you stop bothering with unnecessary fiddling.`,
			`That's kind of it, there are few other big things on the way, but it's not yet here and would require quite some shuffling around.`,
			`Oh right, twitter died recently, huh, very unfortunate indeed, oh well. Take care.`
		],
		links: [
			{
				label: `Child support group (you're the child)`,
				href: import.meta.env.VITE_SUPPORT_URL,
			},
		],
	},
]

export default defineComponent({
	setup() {
		const key = 'updates'

		const updatesInfo = reactive(get<Updates>(key) || { ...defaultUpdates })

		const saveChanges = () => set(key, updatesInfo)

		const nextPage = () => {
			updatesInfo.version++
			saveChanges()
		}
		const skipForNow = () => {
			modalShown.value = false
		}

		const dontBother = () => {
			updatesInfo.dontShow = true
			modalShown.value = false
			saveChanges()
		}

		const currentNews = computed(() =>
			!updatesInfo.dontShow && updatesInfo.version < news.length ? news[updatesInfo.version] : null,
		)
		const modalShown = ref(Boolean(currentNews))

		return { updatesInfo, news, currentNews, modalShown, nextPage, skipForNow, dontBother }
	},
})
</script>
