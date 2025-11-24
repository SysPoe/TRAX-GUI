<script lang="ts">
	import "$lib/styles/common.css";

	let { children } = $props();
</script>

<hr>
<nav>
    <a href="/admin">Dashboard</a> |
    <a href="/admin/logout">Logout</a>
</nav>

{@render children()}
