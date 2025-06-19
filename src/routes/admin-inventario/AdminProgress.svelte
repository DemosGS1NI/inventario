<script>
	import { TrendingUp, MapPin, Users } from 'lucide-svelte';
	
	export let progressData;
	export let vistaActualStats = { counted: 0, validated: 0 };
	$: percentValidated = vistaActualStats.counted > 0 ? Math.round((vistaActualStats.validated / vistaActualStats.counted) * 100): 0;
</script>

{#if progressData && progressData.overallExercise}
	<div class="sticky top-16 z-10 mb-6 grid grid-cols-1 gap-4 bg-gray-100 p-2 md:grid-cols-3">
		<!-- Overall Exercise Progress -->
		<div class="rounded-lg bg-white p-4 shadow">
			<div class="flex items-center gap-2 mb-2">
				<TrendingUp size={20} class="text-blue-500" />
				<h3 class="font-semibold text-gray-800">Progreso General</h3>
			</div>
			<div class="space-y-2">
				<div class="flex justify-between text-sm">
					<span>Contados:</span>
					<span class="font-medium">
						{progressData.overallExercise.countedProducts}/{progressData.overallExercise.totalProducts}
						({progressData.overallExercise.percentageCounted}%)
					</span>
				</div>
				<div class="w-full bg-gray-200 rounded-full h-2">
					<div 
						class="bg-blue-500 h-2 rounded-full transition-all duration-300" 
						style="width: {progressData.overallExercise.percentageCounted}%"
					></div>
				</div>
				<div class="flex justify-between text-sm">
					<span>Validados:</span>
					<span class="font-medium text-green-600">
						{progressData.overallExercise.validatedProducts} ({progressData.overallExercise.percentageValidated}%)
					</span>
				</div>
			</div>
		</div>

		<!-- Current View Progress: always show -->
		<div class="rounded-lg bg-white p-4 shadow">
			<div class="flex items-center gap-2 mb-2">
				<MapPin size={20} class="text-green-500" />
				<h3 class="font-semibold text-gray-800">Vista Actual</h3>
			</div>
			<div class="space-y-2">
				<div class="flex justify-between text-sm">
					<span>Contados:</span>
					<span class="font-medium">
						{vistaActualStats.counted}
					</span>
				</div>
				<div class="w-full bg-gray-200 rounded-full h-2">
					<div 
						class="bg-green-500 h-2 rounded-full transition-all duration-300" 
						style="width: {percentValidated}%"
					></div>
				</div>
				<div class="flex justify-between text-sm">
					<span>Validados:</span>
					<span class="font-medium text-green-600">
						{vistaActualStats.validated}
					</span>
				</div>
			</div>
		</div>

		<!-- Summary Stats -->
		<div class="rounded-lg bg-white p-4 shadow">
			<div class="flex items-center gap-2 mb-2">
				<Users size={20} class="text-purple-500" />
				<h3 class="font-semibold text-gray-800">Resumen</h3>
			</div>
			<div class="space-y-1 text-sm">
				<div class="flex justify-between">
					<span>Bodegas:</span>
					<span class="font-medium">{progressData.summary.totalBodegas}</span>
				</div>
				<div class="flex justify-between">
					<span>Ubicaciones:</span>
					<span class="font-medium">{progressData.summary.totalUbicaciones}</span>
				</div>
				<div class="flex justify-between">
					<span>Pendientes Validación:</span>
					<span class="font-medium text-orange-600">{progressData.summary.pendingValidation}</span>
				</div>
			</div>
		</div>
	</div>
{/if}