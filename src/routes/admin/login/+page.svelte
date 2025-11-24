<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';

    export let form: ActionData;
</script>

<div class="login-container">
    <h1>Login</h1>

    {#if form?.incorrect}
        <p class="error">Incorrect password</p>
    {/if}

    <form method="POST" use:enhance>
        <label>
            Password:
            <input type="password" name="password" required placeholder="Enter password" />
        </label>
        <button type="submit">Login</button>
    </form>
</div>

<style>
    .login-container {
        max-width: 300px;
        margin: 2rem auto;
        font-family: sans-serif;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    input {
        padding: 0.5rem;
        font-size: 1rem;
    }

    button {
        padding: 0.5rem;
        cursor: pointer;
        background-color: #333;
        color: white;
        border: none;
    }

    .error {
        color: red;
        font-weight: bold;
    }
</style>