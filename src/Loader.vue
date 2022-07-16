<template>
	<n-space v-if="loading" justify="center">
		<n-gradient-text
			gradient="linear-gradient(90deg, rgb(255,51,0) 0%, rgb(102,255,51) 50%, rgb(51,102,255) 100%)"
			:font-size="24"
			>~Loading~</n-gradient-text
		>
		<div v-if="failed">
			<p>
				Oh-oh, seems like something went wrong somewhere, if there's no apparent problem, smack
				developer few times to make it work.
			</p>
			<p v-if="typeof failed === 'string'">
				Here's a friendly (not) message from developer about the issue:
				<b>{{ failed }}</b>
			</p>
		</div>
	</n-space>
	<template v-else>
		<slot></slot>
	</template>
</template>

<script lang="ts">
import { map, take } from 'rxjs'
import { defineComponent } from 'vue'
import { refFrom } from 'vuse-rx/src'
import { NSpace, NGradientText } from 'naive-ui'

import { useVSPluginSingelton } from './helpers'

export default defineComponent({
	setup() {
		const { $ready, $failed } = useVSPluginSingelton()
		const loading = refFrom(
			$ready.pipe(
				map(() => false),
				take(1)
			),
			true
		)
		const failed = refFrom<string | boolean>(
			$failed.pipe(
				map(
					() =>
						`Couldn't connect to VTube Studio, make sure it's running and plugin server is enabled. If you changed default port for some reason, contact this plugin developer.`
				)
			),
			false
		)

		return { loading, failed }
	},
	components: { NSpace, NGradientText },
})
</script>
