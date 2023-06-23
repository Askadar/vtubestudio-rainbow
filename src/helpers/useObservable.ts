import { Observable } from 'rxjs'
import { onUnmounted, ref, Ref, UnwrapRef } from 'vue'

interface UseObservable {
	<T>($source: Observable<T>, defaultVal: T): Ref<UnwrapRef<T>>
	<T>($source: Observable<T>): Ref<UnwrapRef<T | undefined>>
}

export const useObservable: UseObservable = ($source, defaultVal = undefined) => {
	const $ref = ref(defaultVal)

	const subscription = $source.subscribe((value) => ($ref.value = value))

	onUnmounted(() => subscription.unsubscribe())

	return $ref
}
