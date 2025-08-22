<!-- src/routes/authorizations/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let data;

	let { authorizations, stats, user, error } = data;
	let loading = false;
	let showConfirmDialog = false;
	let authorizationToRevoke = null;

	// Format date for display
	function formatDate(dateString) {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Check if authorization is expired
	function isExpired(expiresAt) {
		return new Date(expiresAt) < new Date();
	}

	// Handle revoke authorization
	async function revokeAuthorization(authorizationId, appName) {
		authorizationToRevoke = { id: authorizationId, name: appName };
		showConfirmDialog = true;
	}

	// Confirm revocation
	async function confirmRevoke() {
		if (!authorizationToRevoke) return;

		loading = true;
		try {
			const response = await fetch('/api/auth/authorizations', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					authorizationId: authorizationToRevoke.id
				})
			});

			if (response.ok) {
				// Remove from local list
				authorizations = authorizations.filter((auth) => auth.id !== authorizationToRevoke.id);
				stats.totalAuthorizations--;
				stats.activeAuthorizations--;
			} else {
				const errorData = await response.json();
				console.error('Failed to revoke authorization:', errorData);
				alert('Failed to revoke authorization: ' + errorData.message);
			}
		} catch (error) {
			console.error('Error revoking authorization:', error);
			alert('Error revoking authorization. Please try again.');
		} finally {
			loading = false;
			showConfirmDialog = false;
			authorizationToRevoke = null;
		}
	}

	// Navigate back to menu
	function goBack() {
		goto('/menu');
	}

	// Get scope display name
	function getScopeDisplayName(scope) {
		const scopeNames = {
			'read:profile': 'Read Profile',
			'read:inventory': 'Read Inventory',
			'write:inventory': 'Write Inventory',
			'read:reports': 'Read Reports',
			admin: 'Administrator Access'
		};
		return scopeNames[scope] || scope;
	}
</script>

<svelte:head>
	<title>Third-Party Authorizations - Inventory System</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<button
				on:click={goBack}
				class="mb-4 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
			>
				<svg class="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
				Back to Menu
			</button>

			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Third-Party Access</h1>
					<p class="mt-2 text-gray-600">Manage applications that have access to your account</p>
				</div>

				<!-- Statistics -->
				<div class="rounded-lg bg-white p-4 shadow">
					<div class="text-center">
						<div class="text-2xl font-bold text-blue-600">{stats.totalAuthorizations}</div>
						<div class="text-sm text-gray-500">Authorized Apps</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Error Message -->
		{#if error}
			<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="flex">
					<svg class="mr-3 h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
					<div>
						<h3 class="text-sm font-medium text-red-800">Error Loading Data</h3>
						<p class="mt-1 text-sm text-red-700">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Main Content -->
		{#if authorizations.length === 0}
			<!-- Empty State -->
			<div class="py-12 text-center">
				<svg
					class="mx-auto mb-4 h-16 w-16 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					/>
				</svg>
				<h3 class="mb-2 text-lg font-medium text-gray-900">No Third-Party Access Granted</h3>
				<p class="mx-auto max-w-md text-gray-500">
					You haven't authorized any third-party applications to access your account. When you do,
					they will appear here for you to manage.
				</p>
			</div>
		{:else}
			<!-- Authorization Cards -->
			<div class="space-y-4">
				{#each authorizations as auth}
					<div class="rounded-lg border border-gray-200 bg-white p-6 shadow">
						<div class="flex items-start justify-between">
							<div class="flex flex-1 items-start space-x-4">
								<!-- App Logo/Icon -->
								<div
									class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100"
								>
									{#if auth.logoUrl}
										<img
											src={auth.logoUrl}
											alt="{auth.applicationName} logo"
											class="h-8 w-8 rounded"
										/>
									{:else}
										<svg
											class="h-6 w-6 text-blue-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
											/>
										</svg>
									{/if}
								</div>

								<!-- App Details -->
								<div class="min-w-0 flex-1">
									<div class="mb-1 flex items-center space-x-2">
										<h3 class="truncate text-lg font-medium text-gray-900">
											{auth.applicationName}
										</h3>
										{#if isExpired(auth.expiresAt)}
											<span
												class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
											>
												Expired
											</span>
										{:else}
											<span
												class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
											>
												Active
											</span>
										{/if}
									</div>

									{#if auth.description}
										<p class="mb-3 text-sm text-gray-600">{auth.description}</p>
									{/if}

									<!-- Permissions -->
									<div class="mb-3">
										<h4 class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-700">
											Permissions Granted
										</h4>
										<div class="flex flex-wrap gap-1">
											{#each auth.scopes as scope}
												<span
													class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
												>
													{getScopeDisplayName(scope)}
												</span>
											{/each}
										</div>
									</div>

									<!-- Timestamps -->
									<div class="flex space-x-6 text-xs text-gray-500">
										<div>
											<span class="font-medium">Granted:</span>
											{formatDate(auth.grantedAt)}
										</div>
										<div>
											<span class="font-medium">Last Used:</span>
											{formatDate(auth.lastUsedAt)}
										</div>
										<div>
											<span class="font-medium">Expires:</span>
											{formatDate(auth.expiresAt)}
										</div>
									</div>

									{#if auth.websiteUrl}
										<div class="mt-2">
											<a
												href={auth.websiteUrl}
												target="_blank"
												rel="noopener noreferrer"
												class="text-xs text-blue-600 hover:text-blue-800"
											>
												Visit application website →
											</a>
										</div>
									{/if}
								</div>
							</div>

							<!-- Action Button -->
							<button
								on:click={() => revokeAuthorization(auth.id, auth.applicationName)}
								disabled={loading}
								class="ml-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Revoke Access
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Confirmation Dialog -->
{#if showConfirmDialog && authorizationToRevoke}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
		<div class="mx-4 w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center">
				<svg
					class="mr-3 h-6 w-6 text-red-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"
					/>
				</svg>
				<h3 class="text-lg font-medium text-gray-900">Revoke Access</h3>
			</div>

			<p class="mb-6 text-sm text-gray-500">
				Are you sure you want to revoke access for <strong>{authorizationToRevoke.name}</strong>?
				This action cannot be undone and the application will no longer be able to access your
				account.
			</p>

			<div class="flex justify-end space-x-3">
				<button
					on:click={() => {
						showConfirmDialog = false;
						authorizationToRevoke = null;
					}}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					on:click={confirmRevoke}
					disabled={loading}
					class="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
				>
					{#if loading}
						<svg
							class="-ml-1 mr-3 inline h-4 w-4 animate-spin text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Revoking...
					{:else}
						Revoke Access
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
