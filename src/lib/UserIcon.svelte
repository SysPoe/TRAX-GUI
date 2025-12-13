<script lang="ts">
  /**
   * Optional prop for the SVG fill color.
   * Defaults to 'currentColor' which inherits the CSS color property of the parent element.
   */
  export let fill: string = 'currentColor';

  /**
   * Optional prop for the SVG width.
   * Defaults to '1rem'.
   */
  export let width: string = '1rem';

  /**
   * Optional prop for the SVG height.
   * Defaults to '1rem'.
   */
  export let height: string = '1rem';
</script>

<!-- 
The SVG attributes are bound dynamically to the Svelte props.
Note: The `fill` attribute is bound directly. 
The viewBox remains static as it defines the SVG's internal coordinate system.
-->
<svg 
  {fill} 
  {width} 
  {height} 
  viewBox="0 0 32 32" 
  xmlns="http://www.w3.org/2000/svg"
  class="user-icon"
>
  <path 
    d="M16 15.503A5.041 5.041 0 1 0 16 5.42a5.041 5.041 0 0 0 0 10.083zm0 2.215c-6.703 0-11 3.699-11 5.5v3.363h22v-3.363c0-2.178-4.068-5.5-11-5.5z"
  />
</svg>

<style>
  .user-icon {
    margin: -0.2rem;
    margin-top: -0.4rem;
  }
</style>