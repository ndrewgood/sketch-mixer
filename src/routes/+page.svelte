<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import DevInfo from '$lib/components/DevInfo.svelte';
  import { canvasObjectsArr, overlappedCanvases, combinationInProgress, draggingCanvas, options, geminiApiKey, generateOptionCombinationPrompt, generateInstantPrompt, showDevInfo } from '$lib/stores/canvasStore';
  import { getOptionCombination, getInstantCombination } from '$lib/utils';
  import { fly, fade } from 'svelte/transition';
  import { tick } from 'svelte';
  import { circIn, circOut} from 'svelte/easing';

  const settingsIconPath = '/svg/icon-settings.svg';

  let canvases: number[] = [];
  let nextId = 0;
  let imageCombinationInProgress = false;
  let headerTextVisible = false;

  function addCanvas() {
    canvases = [...canvases, nextId];
    nextId += 1;
  }

  function handleLogoMouseEnter() {
    headerTextVisible = true;
  }

  function handleLogoMouseLeave() {
    headerTextVisible = false;
  }

  let optionButtons: HTMLButtonElement[] = [];
  let buttonHeights = [45, 45, 45];
  let contentVisible = false;

  $: if ($options) {
    if ($options.length > 0) {
      handleOptionsChange();
    } else {
      buttonHeights = [45, 45, 45];
    }
  }

  async function handleOptionsChange() {
    contentVisible = true;
    await tick();
    await tick();
    const newHeights = optionButtons.map((button, i) => {
      if (!$options[i]) return 45;
      return button?.scrollHeight ?? buttonHeights[i] ?? 45;
    });
    
    // Check if all values are numbers
    if (newHeights.every(height => typeof height === 'number')) {
      buttonHeights = newHeights;
    }
    console.log('Heights:', newHeights);
  }

  async function handleOptionClick (index: number) {
    if ($combinationInProgress) {
      // Store copies of the variables before nullifying them
      let canvas = $canvasObjectsArr.find(p => p.id === $combinationInProgress![1].id)
      let combinedCanvases = [...$combinationInProgress!]
      let selectedOption = $options[index]
      imageCombinationInProgress = true;
      
      // Clear the state
      // $combinationInProgress = null;
      $options = [];

      // Use the copied variables for the API call
      let combinationImage = await getOptionCombination(
        $geminiApiKey, 
        $generateOptionCombinationPrompt, 
        combinedCanvases, 
        selectedOption
      );
      

      if (combinationImage) {

        imageCombinationInProgress = false;
        $combinationInProgress = null;

        // Ensure the data URL is properly formatted
        if (!combinationImage.startsWith('data:image/png;base64,')) {
          combinationImage = 'data:image/png;base64,' + combinationImage;
        }
        
        // Add new canvas with the combination image
        canvasObjectsArr.update(arr => [
          ...arr,
          {
            id: nextId,
            x: canvas?.x ? canvas.x + 240 : 0,
            y: canvas?.y ? canvas.y + 120 + 18: 0,
            z: arr.length + 1,
            initialImage: combinationImage
          }
        ]);
        
        // Add the canvas to the list
        canvases = [...canvases, nextId];
        nextId += 1;
      }
    }
  }

  async function handleInstantCombination() {
    if ($combinationInProgress) {
      // Store copies of the variables before nullifying them
      let canvas = $canvasObjectsArr.find(p => p.id === $combinationInProgress![1].id)
      let combinedCanvases = [...$combinationInProgress!]
      imageCombinationInProgress = true;

      // Use the copied variables for the API call
      let combinationImage = await getInstantCombination(
        $geminiApiKey, 
        $generateInstantPrompt, 
        combinedCanvases
      );
      
      if (combinationImage) {
        imageCombinationInProgress = false;
        $combinationInProgress = null;


        // Ensure the data URL is properly formatted
        if (!combinationImage.startsWith('data:image/png;base64,')) {
          combinationImage = 'data:image/png;base64,' + combinationImage;
        }
        
        // Add new canvas with the combination image
        canvasObjectsArr.update(arr => [
          ...arr,
          {
            id: nextId,
            x: canvas?.x ? canvas.x + 240 : 0,
            y: canvas?.y ? canvas.y + 120 + 18: 0,
            z: arr.length + 1,
            initialImage: combinationImage
          }
        ]);
        
        // Add the canvas to the list
        canvases = [...canvases, nextId];
        nextId += 1;
      }
    }
  }

  function handleSettingsClick() {
    $showDevInfo = true;
  }

  // Load API key from localStorage on mount
  if (typeof window !== 'undefined') {
    $geminiApiKey = localStorage.getItem('gemini_api_key') || '';
  }
</script>

<svelte:head>
	<title>Sketch Mixer</title>
</svelte:head>

<main style="background-image: url('svg/box-grid.svg');">
  <div class="header">
    <button 
      class='logo' 
      on:mouseenter={handleLogoMouseEnter}
      on:mouseleave={handleLogoMouseLeave}
    >
      <img src="svg/sketch-mixer-logo.svg" alt="Sketch Combiner" width="80" height="80" />
    </button>
    {#if headerTextVisible}
      <div class="header-text">
        <span id="sketchText" 
          in:fly={{ duration: 300, x: -50, delay: 50, easing: circOut }}
          out:fly={{ duration: 300, x: -50, easing: circIn }}
        >Sketch</span>
        <span id="mixerText" 
          in:fly={{ duration: 300, x: -50, delay: 150, easing: circOut }}
          out:fly={{ duration: 300, x: -50, easing: circIn }}
        >Mixer</span>
      </div>
    {/if}
  </div>
  <div class="add-button-container">
    <button class="add-button" on:click={addCanvas}>Add canvas</button>
    <div class="add-button-background"></div>
  </div>

  {#if !$showDevInfo}
    <button class="settings-button" transition:fade={{ duration: 200 }} on:click={() => {handleSettingsClick()}}>
      <img src={settingsIconPath} alt="Settings" width="25" height="25" />
    </button>
  {/if}

  {#if $showDevInfo}
    <DevInfo />
  {/if}

  <div class="canvas-area">
    {#each canvases as id (id)}
      <Canvas {id} {handleInstantCombination} />
    {/each}
    {#if $overlappedCanvases !== null || $combinationInProgress !== null}
      <div class="overlappedBackground" transition:fade={{ duration: 200 }}>
        <svg width="0" height="0">
          <defs>
            <filter id="blurFilter" x="-20%" y="-20%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="30" />
            </filter>
            <mask id="blurMask">
              <g filter="url(#blurFilter)">
                {#if $overlappedCanvases !== null || $combinationInProgress !== null}
                    <rect 
                      class="maskRect {$draggingCanvas ? '' : 'transitioning'}"
                      width="240" 
                      height="272"
                      transform={`
                        translate(
                          ${$overlappedCanvases ? ($canvasObjectsArr.find(p => p.id === $overlappedCanvases![0].id)?.x) : $combinationInProgress ? ($canvasObjectsArr.find(p => p.id === $combinationInProgress![0].id)?.x) : 0} 
                          ${$overlappedCanvases ? ($canvasObjectsArr.find(p => p.id === $overlappedCanvases![0].id)?.y) : $combinationInProgress ? ($canvasObjectsArr.find(p => p.id === $combinationInProgress![0].id)?.y) : 0} 
                        )
                      `}
                      fill="white"
                    />
                    <rect
                      class="maskRect {$draggingCanvas ? '' : 'transitioning'}"
                      width="240" 
                      height="272"
                      transform={`
                        translate(
                          ${$overlappedCanvases ? ($canvasObjectsArr.find(p => p.id === $overlappedCanvases![1].id)?.x) : $combinationInProgress ? ($canvasObjectsArr.find(p => p.id === $combinationInProgress![1].id)?.x) : 0} 
                          ${$overlappedCanvases ? ($canvasObjectsArr.find(p => p.id === $overlappedCanvases![1].id)?.y) : $combinationInProgress ? ($canvasObjectsArr.find(p => p.id === $combinationInProgress![1].id)?.y) : 0} 
                        )
                      `}
                      fill="white"
                    />
                    {#if imageCombinationInProgress}
                    {@const canvas = $canvasObjectsArr.find(p => p.id === $combinationInProgress![1].id)!}

                    <rect
                    class="maskRect {$draggingCanvas ? '' : 'transitioning'}"
                    width="240" 
                    height="272"
                    transform={`
                      translate(
                        ${canvas.x + 240}
                        ${canvas.y + 120 + 18} 

                      )
                    `}
                    fill="white"
                  />
                    {/if}
                {/if}
              </g>
            </mask>
          </defs>
        </svg>
      </div>  
    {/if}
    {#if imageCombinationInProgress}
      {@const canvas = $canvasObjectsArr.find(p => p.id === $combinationInProgress![1].id)!}
      <div 
      transition:fade={{ duration: 400 }} 
        class="imageCombinationPlaceholder loading"
        style:top="{canvas.y + 120 + 18}px"
        style:left="{canvas.x + 240}px"
      >
      </div>
    {/if}
    {#if $combinationInProgress !== null && $combinationInProgress[0] && $canvasObjectsArr.find(p => p.id === $combinationInProgress![0].id) && !imageCombinationInProgress}
      {@const canvas = $canvasObjectsArr.find(p => p.id === $combinationInProgress![1].id)!}
      <div 
        class="combinationInProgress" 
        transition:fade={{ duration: 100 }} 
        style:top="{canvas.y}px"
        style:left="{canvas.x + 240}px"
      >
        <button 
          class={"optionButton " + ($options?.[0] ? 'canvasBg' : 'loading')} 
          bind:this={optionButtons[0]}
          style:max-height="{buttonHeights[0]}px"
          on:click={() => handleOptionClick(0)}
        >
          <div>
            <p style:opacity="{contentVisible && $options?.[0] ? 1 : 0}">{$options ? $options[0] : ''}</p>
          </div>
        </button>
        <button 
        class={"optionButton " + ($options?.[1] ? 'canvasBg' : 'loading')}
          bind:this={optionButtons[1]} 
          style:max-height="{buttonHeights[1]}px"
          on:click={() => handleOptionClick(1)}
        >
          <div>
            <p style:opacity="{contentVisible && $options?.[1] ? 1 : 0}">{$options ? $options[1] : ''}</p>
          </div>
        </button>
        <button 
          class={"optionButton " + ($options?.[2] ? 'canvasBg' : 'loading')}
          bind:this={optionButtons[2]} 
          style:max-height="{buttonHeights[2]}px"
          on:click={() => handleOptionClick(2)}
        >
          <div>
            <p style:opacity="{contentVisible && $options?.[2] ? 1 : 0}">{$options ? $options[2] : ''}</p>
          </div>
        </button>
      </div>
    {/if}
  </div>
</main>

<style>
  @font-face {
    font-family: 'Aspekta';
    src: url('/fonts/Aspekta-400.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  
  @font-face {
    font-family: 'Aspekta';
    src: url('/fonts/Aspekta-700.woff2') format('woff2');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
  
  :global(body) {
    margin: 0;
    font-family: 'Aspekta', sans-serif;
    --highlight: #1255FF;
  }

  

  main {
    min-height: 150vh;
    min-width: 150vw;
    height: 2500px;
    width: 1500px;
    background-size: 8px 8px;
    background-position: center;
    background-repeat: repeat;
  }

  .header {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 10;

  }

  .logo {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 11;
    transition: transform 0.5s cubic-bezier(0.090, 0.545, 0.305, 0.955);
  }

  .logo:hover {
    transform: scale(1.1) rotate(-5deg);
  }

  .logo:active {
    transform: scale(.95) rotate(-5deg);
  }

  .header-text {
    font-size: 30px;
    font-weight: 700;
    color: var(--highlight);
    z-index: 10;
    left: 90px;
    top: 4px;
    position: absolute;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }

  #sketchText {
    position: absolute;
    top: -4px;
  }

  #mixerText {
    position: absolute;
    top: 26px;
  }

  .add-button-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
  }

  .add-button {
    background: var(--highlight);
    font-family: 'Aspekta';
    font-weight: 700;
    color: white;
    border: none;
    padding: 12px 26px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 20px;
    letter-spacing: 0.02em;
    transform: scale(1);
    box-shadow: 0px 0.263343px 4px rgba(0, 0, 0, 0.3), 0px 0.263343px 14px rgba(0, 0, 0, 0.15);
    transition: transform 0.3s cubic-bezier(0.090, 0.545, 0.305, 0.955);
    position: relative;
    z-index: 11;
  }

  .add-button:hover {
    transform: scale(1.05) ;
  }

  .add-button:active {
    transform:  scale(.95);
  }

  .add-button-background {
    position: absolute;
    bottom: 50%;
    left: 50%;
    width: calc(100% + 20px);
    height: calc(100% + 20px);
    transform: translate(-50%, 50%);
    border-radius: 12px;
    background: linear-gradient(-45deg, #3A71FF 0%, #79DBF9 25%, #727FF6 50%, #6CE9C8 75%, #3A71FF 100%) 0/ 200%;
    animation: gradient 3s infinite;
    filter: blur(10px);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .add-button-container:hover .add-button-background {
    opacity: 0.4;
  }

  .settings-button {
    position: fixed;
    top: 28px;
    right: 28px;
    z-index: 10;
    background: var(--canvas-background);
    border-radius: 16px;
    width: 50px;
    height: 50px;
    touch-action: none;
    border: 2px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0px 1px 24px rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(6px);
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: transform 0.3s cubic-bezier(0.090, 0.545, 0.305, 0.955);
  }

  .settings-button img {
    opacity: 0.3;
    transition: opacity 0.3s cubic-bezier(0.090, 0.545, 0.305, 0.955);
  }

  .settings-button:hover {
    transform: scale(1.05) ;
  }

  .settings-button:hover img {
    opacity: 0.5;
  }

  .settings-button:active {
    transform:  scale(.95);
  }

  .canvas-area {
    position: relative;
    min-height: 150vh;
    min-width: 150vw;
    height: 2500px;
    width: 1500px;
  }

  .overlappedBackground {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    background: linear-gradient(-45deg, #3A71FF 0%, #79DBF9 25%, #727FF6 50%, #6CE9C8 75%, #3A71FF 100%) 0/ 200%;
    animation: gradient 3s infinite;
    clip-path: none;
    mask: url(#blurMask);
    opacity: 0.2;
  }
  /* background: linear-gradient(-45deg, #3A71FF 0%, #79F9CA 25%, #7AF180 50%, #79F9CA 75%, #3A71FF 100%) 0/ 500%; */
  /* background: linear-gradient(-45deg,rgba(105, 48, 143, 1) 0%, rgba(133, 63, 180, 1) 15%, rgba(248, 121, 231, 1) 40%, rgba(129, 60, 175, 1) 70%, rgba(105, 48, 143, 1) 100%) 0/ 500%; */


  @keyframes gradient {
    50% { background-position: 100% }
  }

  .combinationInProgress {
    position: absolute;
    width: 260px;
    height: calc(252px + 252px + 12px);
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .optionButton {
    color: #12121288;
    border: 2px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0px 1px 24px rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(6px);
    border-radius: 8px;
    text-align: left;
    width: 100%;
    cursor: pointer;
    font-size: 15px;
    padding: 0;
    transition: color 0.2s ease, max-height 0.3s cubic-bezier(0.090, 0.545, 0.305, 0.955);
    overflow: hidden;
  }

  .optionButton div {
    padding: 12px 14px;
  }

  .optionButton p {
    word-wrap: break-word;
    margin-block-start: 0;
    margin-block-end: 0;
    min-height: 17px;
    transition: opacity 0.3s cubic-bezier(0.090, 0.545, 0.305, 0.955);
  }

  .optionButton:hover {
    color: #121212;
  }

  .loading {
    background: linear-gradient(0deg, #eeeeee 0%, #ffffff 50%, #eeeeee 100%) 0/ 100% 200%;
    animation: placeholderGradient 2s linear infinite;
  }

  .canvasBg {
    background: var(--canvas-background);
  }

  .imageCombinationPlaceholder {
    position: absolute;
    width: 200px;
    height: 236px;

    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-radius: 16px;
    border: 2px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0px 1px 24px rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(6px);
    padding: 8px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 100;
  }

  @keyframes placeholderGradient {
    0% { background-position: 0% 0%; }
    100% { background-position: 0% 200%; }
  }

</style>
